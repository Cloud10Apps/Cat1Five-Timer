import { Router } from "express";
import { db, inspectionsTable, elevatorsTable, buildingsTable, customersTable } from "@workspace/db";
import { eq, and, or, ilike, gte, lte, inArray, ne, isNotNull } from "drizzle-orm";
import dayjs from "dayjs";
import { requireAuth } from "../middleware/auth.js";
import { CreateInspectionBody, ListInspectionsQueryParams, GetInspectionParams, UpdateInspectionParams, DeleteInspectionParams, PreviewNextDueBody } from "@workspace/api-zod";
import { getAccessibleCustomerIds } from "../lib/user-access.js";
import { asyncHandler } from "../lib/asyncHandler.js";

const router = Router();

router.use(requireAuth);

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function toDateStr(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  if (typeof d === "string") return d;
  return dayjs(d).format("YYYY-MM-DD");
}

function computeNextDueDate(lastDate: string | null | undefined, recurrenceYears: number): string | null {
  if (!lastDate) return null;
  return dayjs(lastDate).add(recurrenceYears, "year").format("YYYY-MM-DD");
}

type ResolveResult = {
  nextDueDate: string | null;
  wasAdjusted: boolean;                  // CAT1 self-adjustment
  originalDate?: string;
  adjustedDate?: string;
  reason?: "cat5_year_collision";
  // CAT5 → CAT1 cascade. Populated only for CAT5 inspections that would
  // collide with one or more non-completed CAT1s. The handler executes these
  // UPDATEs in a transaction after saving the CAT5.
  cascadingCat1Adjustments?: Array<{
    inspectionId: number;
    originalDate: string;
    adjustedDate: string;
  }>;
  // Populated when the CAT5 cascade cannot complete because a CAT1 bump
  // would collide with another existing CAT1 (chain collision). The handler
  // rejects with 409 and surfaces this in the error message.
  blocked?: {
    reason: "cat1_chain_collision";
    cat1OriginalYear: string;
    cat1WouldBeYear: string;
  };
};

/**
 * Single source of truth for an inspection's resolved next_due_date.
 *
 * Step 1 — Resolve the candidate date:
 *   - If lastInspectionDate is provided, candidate = lastInspectionDate + recurrenceYears.
 *   - Else, candidate = manualNextDueDate (whatever the user typed).
 *
 * Step 2 — Apply the cross-type rule (traction units only):
 *   - CAT1: if candidate year matches any sibling CAT5's next_due_date year
 *     on the same unit (or matches companionCat5NextDueDate, for the dual-
 *     create flow where the CAT5 hasn't been saved yet), push CAT1 forward
 *     by one year.
 *   - CAT5: if candidate year matches any non-completed sibling CAT1's
 *     next_due_date year, plan a cascade-bump of each colliding CAT1 by one
 *     year. If a bump would chain into another existing CAT1, return a
 *     blocked result instead — handler will 409.
 *
 * recurrence_years is NEVER modified by this function — only the returned date.
 */
async function resolveNextDueDate(args: {
  elevatorId: number;
  inspectionType: "CAT1" | "CAT5";
  recurrenceYears: number;
  lastInspectionDate: string | null;
  manualNextDueDate: string | null;
  excludeInspectionId?: number;
  companionCat5NextDueDate?: string | null;
  orgId: number;
}): Promise<ResolveResult> {
  const { elevatorId, inspectionType, recurrenceYears, lastInspectionDate, manualNextDueDate, excludeInspectionId, companionCat5NextDueDate, orgId } = args;

  const computed = computeNextDueDate(lastInspectionDate, recurrenceYears);
  const candidate = computed ?? manualNextDueDate ?? null;

  if (!candidate) return { nextDueDate: null, wasAdjusted: false };

  const elevatorRow = await db
    .select({ type: elevatorsTable.type })
    .from(elevatorsTable)
    .where(and(eq(elevatorsTable.id, elevatorId), eq(elevatorsTable.organizationId, orgId)))
    .limit(1);
  if (elevatorRow.length === 0 || elevatorRow[0].type !== "traction") {
    return { nextDueDate: candidate, wasAdjusted: false };
  }

  const candidateYear = candidate.slice(0, 4);

  if (inspectionType === "CAT1") {
    const conds: any[] = [
      eq(inspectionsTable.elevatorId, elevatorId),
      eq(inspectionsTable.inspectionType, "CAT5"),
      eq(inspectionsTable.organizationId, orgId),
      gte(inspectionsTable.nextDueDate, `${candidateYear}-01-01`),
      lte(inspectionsTable.nextDueDate, `${candidateYear}-12-31`),
    ];
    if (excludeInspectionId !== undefined) conds.push(ne(inspectionsTable.id, excludeInspectionId));

    const collision = await db
      .select({ id: inspectionsTable.id })
      .from(inspectionsTable)
      .where(and(...conds))
      .limit(1);

    const companionHit =
      !!companionCat5NextDueDate &&
      companionCat5NextDueDate.slice(0, 4) === candidateYear;

    if (collision.length === 0 && !companionHit) return { nextDueDate: candidate, wasAdjusted: false };

    const adjusted = dayjs(candidate).add(1, "year").format("YYYY-MM-DD");
    return {
      nextDueDate: adjusted,
      wasAdjusted: true,
      originalDate: candidate,
      adjustedDate: adjusted,
      reason: "cat5_year_collision",
    };
  }

  // CAT5 branch — find sibling non-completed CAT1s in the same year on this unit.
  const cat1Conds: any[] = [
    eq(inspectionsTable.elevatorId, elevatorId),
    eq(inspectionsTable.inspectionType, "CAT1"),
    eq(inspectionsTable.organizationId, orgId),
    ne(inspectionsTable.status, "COMPLETED"),
    gte(inspectionsTable.nextDueDate, `${candidateYear}-01-01`),
    lte(inspectionsTable.nextDueDate, `${candidateYear}-12-31`),
  ];
  const collidingCat1s = await db
    .select({ id: inspectionsTable.id, nextDueDate: inspectionsTable.nextDueDate })
    .from(inspectionsTable)
    .where(and(...cat1Conds));

  if (collidingCat1s.length === 0) return { nextDueDate: candidate, wasAdjusted: false };

  const planned = collidingCat1s.map((c) => ({
    inspectionId: c.id,
    originalDate: c.nextDueDate!,
    adjustedDate: dayjs(c.nextDueDate!).add(1, "year").format("YYYY-MM-DD"),
  }));

  // Chain-collision: would any planned bump land on another existing CAT1 we
  // aren't already bumping?
  const bumpingIds = new Set(planned.map((p) => p.inspectionId));
  for (const p of planned) {
    const bumpYear = p.adjustedDate.slice(0, 4);
    const chainConds: any[] = [
      eq(inspectionsTable.elevatorId, elevatorId),
      eq(inspectionsTable.inspectionType, "CAT1"),
      eq(inspectionsTable.organizationId, orgId),
      gte(inspectionsTable.nextDueDate, `${bumpYear}-01-01`),
      lte(inspectionsTable.nextDueDate, `${bumpYear}-12-31`),
    ];
    const chainHit = await db
      .select({ id: inspectionsTable.id })
      .from(inspectionsTable)
      .where(and(...chainConds));
    const blockedBy = chainHit.find((row) => !bumpingIds.has(row.id));
    if (blockedBy) {
      return {
        nextDueDate: candidate,
        wasAdjusted: false,
        blocked: {
          reason: "cat1_chain_collision",
          cat1OriginalYear: p.originalDate.slice(0, 4),
          cat1WouldBeYear: bumpYear,
        },
      };
    }
  }

  return {
    nextDueDate: candidate,
    wasAdjusted: false,
    cascadingCat1Adjustments: planned,
  };
}

function computeStatus(status: string, nextDueDate: string | null | undefined, completionDate: string | null | undefined): string {
  if (status === "COMPLETED") return "COMPLETED";
  if (nextDueDate && !completionDate) {
    const today = dayjs().startOf("day");
    const due = dayjs(nextDueDate);
    if (due.isBefore(today)) return "OVERDUE";
  }
  return status;
}

async function fetchInspection(id: number, orgId: number) {
  const rows = await db
    .select({
      id: inspectionsTable.id,
      elevatorId: inspectionsTable.elevatorId,
      elevatorName: elevatorsTable.name,
      elevatorType: elevatorsTable.type,
      buildingId: buildingsTable.id,
      buildingName: buildingsTable.name,
      customerId: customersTable.id,
      customerName: customersTable.name,
      inspectionType: inspectionsTable.inspectionType,
      recurrenceYears: inspectionsTable.recurrenceYears,
      lastInspectionDate: inspectionsTable.lastInspectionDate,
      nextDueDate: inspectionsTable.nextDueDate,
      scheduledDate: inspectionsTable.scheduledDate,
      completionDate: inspectionsTable.completionDate,
      status: inspectionsTable.status,
      notes: inspectionsTable.notes,
      organizationId: inspectionsTable.organizationId,
      createdAt: inspectionsTable.createdAt,
    })
    .from(inspectionsTable)
    .leftJoin(elevatorsTable, eq(inspectionsTable.elevatorId, elevatorsTable.id))
    .leftJoin(buildingsTable, eq(elevatorsTable.buildingId, buildingsTable.id))
    .leftJoin(customersTable, eq(buildingsTable.customerId, customersTable.id))
    .where(and(eq(inspectionsTable.id, id), eq(inspectionsTable.organizationId, orgId)))
    .limit(1);
  return rows[0];
}

function formatInspection(r: any) {
  if (!r) return null;
  const status = computeStatus(r.status, r.nextDueDate, r.completionDate);
  return {
    id: r.id,
    elevatorId: r.elevatorId,
    elevatorName: r.elevatorName ?? undefined,
    elevatorType: r.elevatorType ?? undefined,
    buildingId: r.buildingId ?? undefined,
    buildingName: r.buildingName ?? undefined,
    customerId: r.customerId ?? undefined,
    customerName: r.customerName ?? undefined,
    inspectionType: r.inspectionType,
    recurrenceYears: r.recurrenceYears,
    lastInspectionDate: r.lastInspectionDate ?? undefined,
    nextDueDate: r.nextDueDate ?? undefined,
    scheduledDate: r.scheduledDate ?? undefined,
    completionDate: r.completionDate ?? undefined,
    status,
    trueStatus: r.status,
    notes: r.notes ?? undefined,
    organizationId: r.organizationId,
    createdAt: r.createdAt.toISOString(),
  };
}

async function checkDuplicate(
  elevatorId: number,
  inspectionType: string,
  nextDueDate: string | null,
  orgId: number,
  excludeId?: number
): Promise<{ elevatorName: string; dueYear: string } | null> {
  if (!nextDueDate) return null;
  const dueYear = nextDueDate.slice(0, 4);
  const conditions: any[] = [
    eq(inspectionsTable.elevatorId, elevatorId),
    eq(inspectionsTable.inspectionType, inspectionType as any),
    eq(inspectionsTable.organizationId, orgId),
    gte(inspectionsTable.nextDueDate, `${dueYear}-01-01`),
    lte(inspectionsTable.nextDueDate, `${dueYear}-12-31`),
  ];
  if (excludeId !== undefined) conditions.push(ne(inspectionsTable.id, excludeId));
  const rows = await db
    .select({ id: inspectionsTable.id, elevatorName: elevatorsTable.name })
    .from(inspectionsTable)
    .leftJoin(elevatorsTable, eq(inspectionsTable.elevatorId, elevatorsTable.id))
    .where(and(...conditions))
    .limit(1);
  if (rows.length === 0) return null;
  return { elevatorName: rows[0].elevatorName ?? `Unit ${elevatorId}`, dueYear };
}

type FollowUpResult =
  | { created: true; adjusted?: { originalDate: string; adjustedDate: string }; cascadedCat1s?: number }
  | { created: false; reason: "already_exists" | "duplicate_year" | "cat1_chain_collision"; dueYear?: string }
  | { created: false; reason: "not_applicable" };

/**
 * Auto-create the next-cycle follow-up record when an inspection is marked
 * completed. Participates in the caller's transaction when `tx` is supplied,
 * so cascade UPDATEs from the parent operation and the follow-up's own
 * cascade UPDATEs commit atomically.
 */
async function maybeCreateFollowUp(
  completedInspection: { id: number; elevatorId: number; inspectionType: string; recurrenceYears: number; completionDate: string | null | undefined; nextDueDate: string | null | undefined; status: string },
  orgId: number,
  tx?: Tx
): Promise<FollowUpResult> {
  const dbi = tx ?? db;
  if (completedInspection.status !== "COMPLETED" || !completedInspection.completionDate) {
    return { created: false, reason: "not_applicable" };
  }

  const newLastDate = completedInspection.completionDate;
  const cycleBase =
    completedInspection.nextDueDate && completedInspection.completionDate < completedInspection.nextDueDate
      ? completedInspection.nextDueDate
      : completedInspection.completionDate;

  const resolved = await resolveNextDueDate({
    elevatorId: completedInspection.elevatorId,
    inspectionType: completedInspection.inspectionType as "CAT1" | "CAT5",
    recurrenceYears: completedInspection.recurrenceYears,
    lastInspectionDate: cycleBase,
    manualNextDueDate: null,
    orgId,
  });

  if (resolved.blocked) return { created: false, reason: "cat1_chain_collision" };

  const newNextDue = resolved.nextDueDate;
  if (!newNextDue) return { created: false, reason: "not_applicable" };

  const existing = await dbi
    .select({ id: inspectionsTable.id })
    .from(inspectionsTable)
    .where(
      and(
        eq(inspectionsTable.elevatorId, completedInspection.elevatorId),
        eq(inspectionsTable.inspectionType, completedInspection.inspectionType as any),
        eq(inspectionsTable.organizationId, orgId),
        ne(inspectionsTable.id, completedInspection.id),
        eq(inspectionsTable.lastInspectionDate, newLastDate)
      )
    )
    .limit(1);

  if (existing.length > 0) return { created: false, reason: "already_exists" };

  const dupCheck = await checkDuplicate(completedInspection.elevatorId, completedInspection.inspectionType, newNextDue, orgId);
  if (dupCheck) return { created: false, reason: "duplicate_year", dueYear: dupCheck.dueYear };

  await dbi.insert(inspectionsTable).values({
    elevatorId: completedInspection.elevatorId,
    organizationId: orgId,
    inspectionType: completedInspection.inspectionType as any,
    recurrenceYears: completedInspection.recurrenceYears,
    lastInspectionDate: newLastDate,
    nextDueDate: newNextDue,
    scheduledDate: null,
    completionDate: null,
    status: "NOT_STARTED",
    notes: null,
  });

  if (resolved.cascadingCat1Adjustments && resolved.cascadingCat1Adjustments.length > 0) {
    for (const adj of resolved.cascadingCat1Adjustments) {
      await dbi
        .update(inspectionsTable)
        .set({ nextDueDate: adj.adjustedDate })
        .where(and(eq(inspectionsTable.id, adj.inspectionId), eq(inspectionsTable.organizationId, orgId)));
    }
  }

  return {
    created: true,
    adjusted: resolved.wasAdjusted
      ? { originalDate: resolved.originalDate!, adjustedDate: resolved.adjustedDate! }
      : undefined,
    cascadedCat1s: resolved.cascadingCat1Adjustments?.length || undefined,
  };
}

router.get("/", asyncHandler(async (req, res) => {
  const params = ListInspectionsQueryParams.safeParse(req.query);
  const orgId = req.user!.organizationId;

  const allowedIds = await getAccessibleCustomerIds(req.user!);
  if (allowedIds !== null && allowedIds.length === 0) { res.json([]); return; }

  const conditions: any[] = [eq(inspectionsTable.organizationId, orgId)];
  if (allowedIds !== null) conditions.push(inArray(customersTable.id, allowedIds));
  if (params.success) {
    if (params.data.elevatorId) conditions.push(eq(inspectionsTable.elevatorId, params.data.elevatorId));
    if (params.data.buildingId) conditions.push(eq(buildingsTable.id, params.data.buildingId));
    if (params.data.customerId) conditions.push(eq(customersTable.id, params.data.customerId));
    if (params.data.status) conditions.push(eq(inspectionsTable.status, params.data.status as any));
    if (params.data.inspectionType) conditions.push(eq(inspectionsTable.inspectionType, params.data.inspectionType));
    if (params.data.elevatorType) conditions.push(eq(elevatorsTable.type, params.data.elevatorType));
    if ((params.data as any).bank) conditions.push(eq(elevatorsTable.bank, (params.data as any).bank));
    if (params.data.search) conditions.push(ilike(elevatorsTable.name, `%${params.data.search}%`));
    if (params.data.month && params.data.year) {
      const startDate = dayjs()
        .year(params.data.year)
        .month(params.data.month - 1)
        .startOf("month")
        .format("YYYY-MM-DD");
      const endDate = dayjs()
        .year(params.data.year)
        .month(params.data.month - 1)
        .endOf("month")
        .format("YYYY-MM-DD");
      conditions.push(
        or(
          and(
            isNotNull(inspectionsTable.nextDueDate),
            gte(inspectionsTable.nextDueDate, startDate),
            lte(inspectionsTable.nextDueDate, endDate)
          ),
          and(
            isNotNull(inspectionsTable.scheduledDate),
            gte(inspectionsTable.scheduledDate, startDate),
            lte(inspectionsTable.scheduledDate, endDate)
          ),
          and(
            isNotNull(inspectionsTable.completionDate),
            gte(inspectionsTable.completionDate, startDate),
            lte(inspectionsTable.completionDate, endDate)
          )
        )!
      );
    }
    const pd = params.data as any;
    if (pd.lastInspectionDateFrom || pd.lastInspectionDateTo) {
      conditions.push(isNotNull(inspectionsTable.lastInspectionDate));
      if (pd.lastInspectionDateFrom) conditions.push(gte(inspectionsTable.lastInspectionDate, pd.lastInspectionDateFrom));
      if (pd.lastInspectionDateTo)   conditions.push(lte(inspectionsTable.lastInspectionDate, pd.lastInspectionDateTo));
    }
    if (pd.nextDueDateFrom || pd.nextDueDateTo) {
      conditions.push(isNotNull(inspectionsTable.nextDueDate));
      if (pd.nextDueDateFrom) conditions.push(gte(inspectionsTable.nextDueDate, pd.nextDueDateFrom));
      if (pd.nextDueDateTo)   conditions.push(lte(inspectionsTable.nextDueDate, pd.nextDueDateTo));
    }
    if (pd.scheduledDateFrom || pd.scheduledDateTo) {
      conditions.push(isNotNull(inspectionsTable.scheduledDate));
      if (pd.scheduledDateFrom) conditions.push(gte(inspectionsTable.scheduledDate, pd.scheduledDateFrom));
      if (pd.scheduledDateTo)   conditions.push(lte(inspectionsTable.scheduledDate, pd.scheduledDateTo));
    }
    if (pd.completionDateFrom || pd.completionDateTo) {
      conditions.push(isNotNull(inspectionsTable.completionDate));
      if (pd.completionDateFrom) conditions.push(gte(inspectionsTable.completionDate, pd.completionDateFrom));
      if (pd.completionDateTo)   conditions.push(lte(inspectionsTable.completionDate, pd.completionDateTo));
    }
  }

  const rows = await db
    .select({
      id: inspectionsTable.id,
      elevatorId: inspectionsTable.elevatorId,
      elevatorName: elevatorsTable.name,
      elevatorType: elevatorsTable.type,
      buildingId: buildingsTable.id,
      buildingName: buildingsTable.name,
      customerId: customersTable.id,
      customerName: customersTable.name,
      inspectionType: inspectionsTable.inspectionType,
      recurrenceYears: inspectionsTable.recurrenceYears,
      lastInspectionDate: inspectionsTable.lastInspectionDate,
      nextDueDate: inspectionsTable.nextDueDate,
      scheduledDate: inspectionsTable.scheduledDate,
      completionDate: inspectionsTable.completionDate,
      status: inspectionsTable.status,
      notes: inspectionsTable.notes,
      organizationId: inspectionsTable.organizationId,
      createdAt: inspectionsTable.createdAt,
    })
    .from(inspectionsTable)
    .leftJoin(elevatorsTable, eq(inspectionsTable.elevatorId, elevatorsTable.id))
    .leftJoin(buildingsTable, eq(elevatorsTable.buildingId, buildingsTable.id))
    .leftJoin(customersTable, eq(buildingsTable.customerId, customersTable.id))
    .where(and(...conditions))
    .orderBy(inspectionsTable.nextDueDate);

  res.json(rows.map(formatInspection));
}));

function sanitizeDates(body: Record<string, unknown>) {
  const dateCols = ["lastInspectionDate", "nextDueDate", "scheduledDate", "completionDate"];
  const result = { ...body };
  for (const col of dateCols) {
    if (result[col] === "" || result[col] === null) result[col] = undefined;
  }
  return result;
}

router.post("/preview-next-due", asyncHandler(async (req, res) => {
  const parsed = PreviewNextDueBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const orgId = req.user!.organizationId;
  const result = await resolveNextDueDate({
    elevatorId: parsed.data.elevatorId,
    inspectionType: parsed.data.inspectionType,
    recurrenceYears: parsed.data.recurrenceYears,
    lastInspectionDate: toDateStr(parsed.data.lastInspectionDate),
    manualNextDueDate: toDateStr(parsed.data.manualNextDueDate),
    excludeInspectionId: parsed.data.excludeInspectionId,
    companionCat5NextDueDate: toDateStr(parsed.data.companionCat5NextDueDate),
    orgId,
  });
  res.json(result);
}));

router.post("/", asyncHandler(async (req, res) => {
  const parsed = CreateInspectionBody.safeParse(sanitizeDates(req.body));
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const orgId = req.user!.organizationId;
  const { elevatorId, inspectionType, recurrenceYears, lastInspectionDate, nextDueDate: manualNextDueDate, scheduledDate, completionDate, status, notes } = parsed.data;
  const lastInspDateStr = toDateStr(lastInspectionDate);
  const scheduledDateStr = toDateStr(scheduledDate);
  const completionDateStr = toDateStr(completionDate);

  const resolved = await resolveNextDueDate({
    elevatorId,
    inspectionType,
    recurrenceYears,
    lastInspectionDate: lastInspDateStr,
    manualNextDueDate: toDateStr(manualNextDueDate),
    orgId,
  });

  if (resolved.blocked) {
    res.status(409).json({
      error: `Cannot save this CAT 5 with a next due date in ${resolved.blocked.cat1OriginalYear}. A CAT 1 is already due in ${resolved.blocked.cat1OriginalYear} on this unit, and shifting it to ${resolved.blocked.cat1WouldBeYear} would collide with another existing CAT 1. Resolve the CAT 1 records manually first.`,
    });
    return;
  }

  const nextDueDate = resolved.nextDueDate;

  const dup = await checkDuplicate(elevatorId, inspectionType, nextDueDate, orgId);
  if (dup) {
    const typeLabel = inspectionType === "CAT5" ? "Cat5" : "Cat1";
    res.status(409).json({ error: `A ${typeLabel} inspection for "${dup.elevatorName}" already exists with a Due Year of ${dup.dueYear}` });
    return;
  }

  const { inserted, followUp } = await db.transaction(async (tx) => {
    const ins = await tx.insert(inspectionsTable).values({
      elevatorId,
      organizationId: orgId,
      inspectionType,
      recurrenceYears,
      lastInspectionDate: lastInspDateStr,
      nextDueDate,
      scheduledDate: scheduledDateStr,
      completionDate: completionDateStr,
      status: status ?? "NOT_STARTED",
      notes: notes ?? null,
    }).returning();

    if (resolved.cascadingCat1Adjustments && resolved.cascadingCat1Adjustments.length > 0) {
      for (const adj of resolved.cascadingCat1Adjustments) {
        await tx
          .update(inspectionsTable)
          .set({ nextDueDate: adj.adjustedDate })
          .where(and(eq(inspectionsTable.id, adj.inspectionId), eq(inspectionsTable.organizationId, orgId)));
      }
    }

    const fu = await maybeCreateFollowUp(
      { id: ins[0].id, elevatorId, inspectionType, recurrenceYears, completionDate: completionDateStr, nextDueDate, status: status ?? "NOT_STARTED" },
      orgId,
      tx,
    );

    return { inserted: ins, followUp: fu };
  });

  const row = await fetchInspection(inserted[0].id, orgId);
  const formatted = formatInspection(row);

  const warnings: string[] = [];
  if (resolved.wasAdjusted) {
    warnings.push(
      `Next due date adjusted from ${resolved.originalDate} to ${resolved.adjustedDate}. A CAT 5 is already due in ${resolved.originalDate!.slice(0, 4)} on this unit, and a traction unit cannot have a CAT 1 and CAT 5 due in the same calendar year.`
    );
  }
  if (resolved.cascadingCat1Adjustments && resolved.cascadingCat1Adjustments.length > 0) {
    const n = resolved.cascadingCat1Adjustments.length;
    const years = resolved.cascadingCat1Adjustments
      .map((a) => `${a.originalDate.slice(0, 4)} → ${a.adjustedDate.slice(0, 4)}`)
      .join(", ");
    warnings.push(
      `${n} existing CAT 1 record${n === 1 ? "" : "s"} on this unit ${n === 1 ? "was" : "were"} bumped forward by one year (${years}) to avoid sharing a calendar year with this CAT 5. A traction unit cannot have a CAT 1 and CAT 5 due in the same calendar year.`
    );
  }
  if (followUp.created === false && followUp.reason === "duplicate_year") {
    warnings.push(
      `A ${followUp.dueYear} ${inspectionType === "CAT5" ? "CAT 5" : "CAT 1"} inspection already exists for this unit and year, so a follow-up inspection record was not created. Go to the Inspections menu to verify the dates are correct and resolve any discrepancies.`
    );
  } else if (followUp.created === false && followUp.reason === "cat1_chain_collision") {
    warnings.push(
      `The CAT 5 follow-up was not auto-created because it would collide with a CAT 1 that can't be bumped cleanly. Verify the inspection schedule manually.`
    );
  } else if (followUp.created === true && followUp.adjusted) {
    warnings.push(
      `The follow-up CAT 1 record was created with a next due date of ${followUp.adjusted.adjustedDate} (one year later than the normal cycle) to avoid overlap with the CAT 5 due in ${followUp.adjusted.originalDate.slice(0, 4)}.`
    );
  }
  if (followUp.created === true && followUp.cascadedCat1s) {
    const n = followUp.cascadedCat1s;
    warnings.push(
      `${n} existing CAT 1 record${n === 1 ? "" : "s"} on this unit ${n === 1 ? "was" : "were"} bumped forward by one year to avoid colliding with the new CAT 5 follow-up record.`
    );
  }
  res.status(201).json({ ...formatted, _warning: warnings.length > 0 ? warnings.join(" ") : undefined });
}));

router.get("/:id", asyncHandler(async (req, res) => {
  const params = GetInspectionParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const row = await fetchInspection(params.data.id, req.user!.organizationId);
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(formatInspection(row));
}));

router.put("/:id", asyncHandler(async (req, res) => {
  const params = UpdateInspectionParams.safeParse({ id: Number(req.params.id) });
  const body = CreateInspectionBody.safeParse(sanitizeDates(req.body));
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const orgId = req.user!.organizationId;
  const { elevatorId, inspectionType, recurrenceYears, lastInspectionDate, nextDueDate: manualNextDueDate, scheduledDate, completionDate, status, notes } = body.data;
  const lastInspDateStr = toDateStr(lastInspectionDate);
  const scheduledDateStr = toDateStr(scheduledDate);
  const completionDateStr = toDateStr(completionDate);
  const resolved = await resolveNextDueDate({
    elevatorId,
    inspectionType,
    recurrenceYears,
    lastInspectionDate: lastInspDateStr,
    manualNextDueDate: toDateStr(manualNextDueDate),
    excludeInspectionId: params.data.id,
    orgId,
  });

  if (resolved.blocked) {
    res.status(409).json({
      error: `Cannot save this CAT 5 with a next due date in ${resolved.blocked.cat1OriginalYear}. A CAT 1 is already due in ${resolved.blocked.cat1OriginalYear} on this unit, and shifting it to ${resolved.blocked.cat1WouldBeYear} would collide with another existing CAT 1. Resolve the CAT 1 records manually first.`,
    });
    return;
  }

  const nextDueDate = resolved.nextDueDate;
  const typeLabel = inspectionType === "CAT5" ? "CAT 5" : "CAT 1";

  if (nextDueDate) {
    const ownYearConflict = await checkDuplicate(elevatorId, inspectionType, nextDueDate, orgId, params.data.id);
    if (ownYearConflict) {
      res.status(409).json({
        error: `Saving these dates would set the Next Due date to ${ownYearConflict.dueYear}, but another ${typeLabel} inspection for this unit already has a ${ownYearConflict.dueYear} due date. Please go to the Inspections menu and delete or correct the duplicate record before saving.`,
      });
      return;
    }
  }

  const followUp: FollowUpResult = await db.transaction(async (tx) => {
    await tx
      .update(inspectionsTable)
      .set({ elevatorId, inspectionType, recurrenceYears, lastInspectionDate: lastInspDateStr, nextDueDate, scheduledDate: scheduledDateStr, completionDate: status === "COMPLETED" ? completionDateStr : null, status: status ?? "NOT_STARTED", notes: notes ?? null })
      .where(and(eq(inspectionsTable.id, params.data.id), eq(inspectionsTable.organizationId, orgId)));

    if (resolved.cascadingCat1Adjustments && resolved.cascadingCat1Adjustments.length > 0) {
      for (const adj of resolved.cascadingCat1Adjustments) {
        await tx
          .update(inspectionsTable)
          .set({ nextDueDate: adj.adjustedDate })
          .where(and(eq(inspectionsTable.id, adj.inspectionId), eq(inspectionsTable.organizationId, orgId)));
      }
    }

    return await maybeCreateFollowUp(
      { id: params.data.id, elevatorId, inspectionType, recurrenceYears, completionDate: completionDateStr, nextDueDate, status: status ?? "NOT_STARTED" },
      orgId,
      tx,
    );
  });

  const row = await fetchInspection(params.data.id, orgId);
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const formatted = formatInspection(row);

  const warnings: string[] = [];
  if (resolved.wasAdjusted) {
    warnings.push(
      `Next due date adjusted from ${resolved.originalDate} to ${resolved.adjustedDate}. A CAT 5 is already due in ${resolved.originalDate!.slice(0, 4)} on this unit, and a traction unit cannot have a CAT 1 and CAT 5 due in the same calendar year.`
    );
  }
  if (resolved.cascadingCat1Adjustments && resolved.cascadingCat1Adjustments.length > 0) {
    const n = resolved.cascadingCat1Adjustments.length;
    const years = resolved.cascadingCat1Adjustments
      .map((a) => `${a.originalDate.slice(0, 4)} → ${a.adjustedDate.slice(0, 4)}`)
      .join(", ");
    warnings.push(
      `${n} existing CAT 1 record${n === 1 ? "" : "s"} on this unit ${n === 1 ? "was" : "were"} bumped forward by one year (${years}) to avoid sharing a calendar year with this CAT 5. A traction unit cannot have a CAT 1 and CAT 5 due in the same calendar year.`
    );
  }
  if (followUp.created === false && followUp.reason === "duplicate_year") {
    warnings.push(
      `A ${followUp.dueYear} ${typeLabel} inspection already exists for this unit and year, so a follow-up inspection record was not created. Go to the Inspections menu to verify the dates are correct and resolve any discrepancies.`
    );
  } else if (followUp.created === false && followUp.reason === "cat1_chain_collision") {
    warnings.push(
      `The CAT 5 follow-up was not auto-created because it would collide with a CAT 1 that can't be bumped cleanly. Verify the inspection schedule manually.`
    );
  } else if (followUp.created === true && followUp.adjusted) {
    warnings.push(
      `The follow-up CAT 1 record was created with a next due date of ${followUp.adjusted.adjustedDate} (one year later than the normal cycle) to avoid overlap with the CAT 5 due in ${followUp.adjusted.originalDate.slice(0, 4)}.`
    );
  }
  if (followUp.created === true && followUp.cascadedCat1s) {
    const n = followUp.cascadedCat1s;
    warnings.push(
      `${n} existing CAT 1 record${n === 1 ? "" : "s"} on this unit ${n === 1 ? "was" : "were"} bumped forward by one year to avoid colliding with the new CAT 5 follow-up record.`
    );
  }
  res.json({ ...formatted, _warning: warnings.length > 0 ? warnings.join(" ") : undefined });
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  const params = DeleteInspectionParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const orgId = req.user!.organizationId;
  await db.delete(inspectionsTable).where(and(eq(inspectionsTable.id, params.data.id), eq(inspectionsTable.organizationId, orgId)));
  res.status(204).send();
}));

export default router;
