import { Router } from "express";
import { db, inspectionsTable, elevatorsTable, buildingsTable, customersTable } from "@workspace/db";
import { eq, and, ilike, gte, lte, inArray, ne } from "drizzle-orm";
import dayjs from "dayjs";
import { requireAuth } from "../middleware/auth.js";
import { CreateInspectionBody, ListInspectionsQueryParams, GetInspectionParams, UpdateInspectionParams, DeleteInspectionParams } from "@workspace/api-zod";
import { getAccessibleCustomerIds } from "../lib/user-access.js";

const router = Router();

router.use(requireAuth);

function computeNextDueDate(lastDate: string | null | undefined, recurrenceYears: number): string | null {
  if (!lastDate) return null;
  return dayjs(lastDate).add(recurrenceYears, "year").format("YYYY-MM-DD");
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

async function maybeCreateFollowUp(
  completedInspection: { id: number; elevatorId: number; inspectionType: string; recurrenceYears: number; completionDate: string | null | undefined; status: string },
  orgId: number
) {
  if (completedInspection.status !== "COMPLETED" || !completedInspection.completionDate) return;

  const newLastDate = completedInspection.completionDate;
  const newNextDue = computeNextDueDate(newLastDate, completedInspection.recurrenceYears);
  if (!newNextDue) return;

  // Only skip if a follow-up already exists that directly references this exact completion date
  // as its lastInspectionDate — meaning we already created a follow-up from this specific event.
  // This prevents duplicates on re-saves without blocking unrelated records in the chain.
  const existing = await db
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

  if (existing.length > 0) return;

  await db.insert(inspectionsTable).values({
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
}

router.get("/", async (req, res) => {
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
    if (params.data.status) conditions.push(eq(inspectionsTable.status, params.data.status));
    if (params.data.inspectionType) conditions.push(eq(inspectionsTable.inspectionType, params.data.inspectionType));
    if (params.data.elevatorType) conditions.push(eq(elevatorsTable.type, params.data.elevatorType));
    if (params.data.bank) conditions.push(eq(elevatorsTable.bank, params.data.bank));
    if (params.data.search) conditions.push(ilike(elevatorsTable.name, `%${params.data.search}%`));
    if (params.data.month && params.data.year) {
      const startDate = dayjs().year(params.data.year).month(params.data.month - 1).startOf("month").format("YYYY-MM-DD");
      const endDate = dayjs().year(params.data.year).month(params.data.month - 1).endOf("month").format("YYYY-MM-DD");
      conditions.push(gte(inspectionsTable.nextDueDate, startDate));
      conditions.push(lte(inspectionsTable.nextDueDate, endDate));
    }
    if (params.data.lastInspectionDateFrom) conditions.push(gte(inspectionsTable.lastInspectionDate, params.data.lastInspectionDateFrom));
    if (params.data.lastInspectionDateTo) conditions.push(lte(inspectionsTable.lastInspectionDate, params.data.lastInspectionDateTo));
    if (params.data.nextDueDateFrom) conditions.push(gte(inspectionsTable.nextDueDate, params.data.nextDueDateFrom));
    if (params.data.nextDueDateTo) conditions.push(lte(inspectionsTable.nextDueDate, params.data.nextDueDateTo));
    if (params.data.scheduledDateFrom) conditions.push(gte(inspectionsTable.scheduledDate, params.data.scheduledDateFrom));
    if (params.data.scheduledDateTo) conditions.push(lte(inspectionsTable.scheduledDate, params.data.scheduledDateTo));
    if (params.data.completionDateFrom) conditions.push(gte(inspectionsTable.completionDate, params.data.completionDateFrom));
    if (params.data.completionDateTo) conditions.push(lte(inspectionsTable.completionDate, params.data.completionDateTo));
  }

  const rows = await db
    .select({
      id: inspectionsTable.id,
      elevatorId: inspectionsTable.elevatorId,
      elevatorName: elevatorsTable.name,
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
});

function sanitizeDates(body: Record<string, unknown>) {
  const dateCols = ["lastInspectionDate", "scheduledDate", "completionDate"];
  const result = { ...body };
  for (const col of dateCols) {
    if (result[col] === "" || result[col] === null) result[col] = undefined;
  }
  return result;
}

router.post("/", async (req, res) => {
  const parsed = CreateInspectionBody.safeParse(sanitizeDates(req.body));
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const orgId = req.user!.organizationId;
  const { elevatorId, inspectionType, recurrenceYears, lastInspectionDate, scheduledDate, completionDate, status, notes } = parsed.data;

  const nextDueDate = computeNextDueDate(lastInspectionDate, recurrenceYears);

  const dup = await checkDuplicate(elevatorId, inspectionType, nextDueDate, orgId);
  if (dup) {
    const typeLabel = inspectionType === "CAT5" ? "Cat5" : "Cat1";
    res.status(409).json({ error: `A ${typeLabel} inspection for "${dup.elevatorName}" already exists with a Due Year of ${dup.dueYear}` });
    return;
  }

  const inserted = await db.insert(inspectionsTable).values({
    elevatorId,
    organizationId: orgId,
    inspectionType,
    recurrenceYears,
    lastInspectionDate: lastInspectionDate ?? null,
    nextDueDate,
    scheduledDate: scheduledDate ?? null,
    completionDate: completionDate ?? null,
    status: status ?? "NOT_STARTED",
    notes: notes ?? null,
  }).returning();

  const row = await fetchInspection(inserted[0].id, orgId);
  const formatted = formatInspection(row);
  await maybeCreateFollowUp({ id: inserted[0].id, elevatorId, inspectionType, recurrenceYears, completionDate, status: status ?? "NOT_STARTED" }, orgId);
  res.status(201).json(formatted);
});

router.get("/:id", async (req, res) => {
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
});

router.put("/:id", async (req, res) => {
  const params = UpdateInspectionParams.safeParse({ id: Number(req.params.id) });
  const body = CreateInspectionBody.safeParse(sanitizeDates(req.body));
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const orgId = req.user!.organizationId;
  const { elevatorId, inspectionType, recurrenceYears, lastInspectionDate, scheduledDate, completionDate, status, notes } = body.data;
  const nextDueDate = computeNextDueDate(lastInspectionDate, recurrenceYears);

  const dup = await checkDuplicate(elevatorId, inspectionType, nextDueDate, orgId, params.data.id);
  if (dup) {
    const typeLabel = inspectionType === "CAT5" ? "Cat5" : "Cat1";
    res.status(409).json({ error: `A ${typeLabel} inspection for "${dup.elevatorName}" already exists with a Due Year of ${dup.dueYear}` });
    return;
  }

  await db.update(inspectionsTable)
    .set({ elevatorId, inspectionType, recurrenceYears, lastInspectionDate: lastInspectionDate ?? null, nextDueDate, scheduledDate: scheduledDate ?? null, completionDate: (status === "COMPLETED" ? completionDate : null) ?? null, status: status ?? "NOT_STARTED", notes: notes ?? null })
    .where(and(eq(inspectionsTable.id, params.data.id), eq(inspectionsTable.organizationId, orgId)));

  const row = await fetchInspection(params.data.id, orgId);
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const formatted = formatInspection(row);
  await maybeCreateFollowUp({ id: params.data.id, elevatorId, inspectionType, recurrenceYears, completionDate, status: status ?? "NOT_STARTED" }, orgId);
  res.json(formatted);
});

router.delete("/:id", async (req, res) => {
  const params = DeleteInspectionParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const orgId = req.user!.organizationId;
  await db.delete(inspectionsTable).where(and(eq(inspectionsTable.id, params.data.id), eq(inspectionsTable.organizationId, orgId)));
  res.status(204).send();
});

export default router;
