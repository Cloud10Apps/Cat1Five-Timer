import { Router } from "express";
import { db, inspectionsTable, elevatorsTable, buildingsTable, customersTable } from "@workspace/db";
import { eq, and, count, gte, inArray, sql } from "drizzle-orm";
import dayjs from "dayjs";
import { requireAuth } from "../middleware/auth.js";
import { getAccessibleCustomerIds } from "../lib/user-access.js";
import { asyncHandler } from "../lib/asyncHandler.js";

const router = Router();

router.use(requireAuth);

function parseCustomerIdParam(raw: unknown): number | null {
  if (!raw) return null;
  const n = parseInt(String(raw), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function getEffectiveIds(allowedIds: number[] | null, customerIdParam: number | null): number[] | null {
  if (customerIdParam === null) return allowedIds;
  if (allowedIds === null) return [customerIdParam];
  return allowedIds.includes(customerIdParam) ? [customerIdParam] : [];
}

router.get("/summary", asyncHandler(async (req, res) => {
  const orgId = req.user!.organizationId;
  const customerIdParam = parseCustomerIdParam(req.query.customerId);

  const allowedIds = await getAccessibleCustomerIds(req.user!);
  const effectiveIds = getEffectiveIds(allowedIds, customerIdParam);

  if (effectiveIds !== null && effectiveIds.length === 0) {
    res.json({
      notStartedCount: 0, scheduledCount: 0, inProgressCount: 0,
      completedCount: 0, overdueCount: 0,
      avgDaysToSchedule: null, avgDaysToComplete: null,
    });
    return;
  }

  const currentYear = dayjs().year();
  const todayStr = dayjs().format("YYYY-MM-DD");
  const customerParam = effectiveIds !== null ? effectiveIds.join(",") : "";

  const result = await db.execute(sql`
    SELECT
      -- NOT_STARTED: due this year, not yet scheduled
      COUNT(*) FILTER (
        WHERE i.status = 'NOT_STARTED'
          AND i.completion_date IS NULL
          AND i.next_due_date IS NOT NULL
          AND EXTRACT(YEAR FROM i.next_due_date::date) = ${currentYear}
      ) AS not_started,
      -- SCHEDULED: inspection was scheduled (scheduled_date) in the current year, any due year
      COUNT(*) FILTER (
        WHERE i.status = 'SCHEDULED'
          AND i.scheduled_date IS NOT NULL
          AND EXTRACT(YEAR FROM i.scheduled_date::date) = ${currentYear}
      ) AS scheduled,
      -- IN_PROGRESS: due this year, currently in progress
      COUNT(*) FILTER (
        WHERE i.status = 'IN_PROGRESS'
          AND i.completion_date IS NULL
          AND i.next_due_date IS NOT NULL
          AND EXTRACT(YEAR FROM i.next_due_date::date) = ${currentYear}
      ) AS in_progress,
      -- COMPLETED: completion date in current year, any due year
      COUNT(*) FILTER (
        WHERE i.completion_date IS NOT NULL
          AND EXTRACT(YEAR FROM i.completion_date::date) = ${currentYear}
      ) AS completed,
      COUNT(*) FILTER (
        WHERE i.completion_date IS NULL
          AND i.next_due_date IS NOT NULL
          AND i.next_due_date::date < ${todayStr}::date
      ) AS overdue,
      AVG(i.scheduled_date::date - i.next_due_date::date) FILTER (
        WHERE i.scheduled_date IS NOT NULL
          AND i.next_due_date IS NOT NULL
          AND EXTRACT(YEAR FROM i.scheduled_date::date) = ${currentYear}
      ) AS avg_schedule,
      AVG(i.completion_date::date - i.next_due_date::date) FILTER (
        WHERE i.completion_date IS NOT NULL
          AND i.next_due_date IS NOT NULL
          AND EXTRACT(YEAR FROM i.completion_date::date) = ${currentYear}
      ) AS avg_complete
    FROM inspections i
    JOIN elevators e ON e.id = i.elevator_id
    JOIN buildings b ON b.id = e.building_id
    WHERE i.organization_id = ${orgId}
      AND (${customerParam} = '' OR b.customer_id = ANY(string_to_array(${customerParam}, ',')::int[]))
  `) as unknown as { rows: any[] };

  const row = result.rows[0] ?? {};
  const parseAvg = (val: string | null): number | null =>
    val == null ? null : parseFloat(parseFloat(val).toFixed(1));

  res.json({
    notStartedCount:   Number(row.not_started   ?? 0),
    scheduledCount:    Number(row.scheduled      ?? 0),
    inProgressCount:   Number(row.in_progress    ?? 0),
    completedCount:    Number(row.completed      ?? 0),
    overdueCount:      Number(row.overdue        ?? 0),
    avgDaysToSchedule: parseAvg(row.avg_schedule ?? null),
    avgDaysToComplete: parseAvg(row.avg_complete ?? null),
  });
}));

router.get("/attention", asyncHandler(async (req, res) => {
  const orgId = req.user!.organizationId;
  const today = dayjs();
  const todayStr = today.format("YYYY-MM-DD");
  const currentYear = today.year();
  const customerIdParam = parseCustomerIdParam(req.query.customerId);

  const allowedIds = await getAccessibleCustomerIds(req.user!);
  const effectiveIds = getEffectiveIds(allowedIds, customerIdParam);
  if (effectiveIds !== null && effectiveIds.length === 0) { res.json([]); return; }

  const conditions: any[] = [
    eq(inspectionsTable.organizationId, orgId),
    sql`${inspectionsTable.nextDueDate} IS NOT NULL`,
    sql`(
      ${inspectionsTable.nextDueDate}::date < ${todayStr}::date
      OR EXTRACT(YEAR FROM ${inspectionsTable.nextDueDate}::date) = ${currentYear}
    )`,
  ];
  if (effectiveIds !== null) conditions.push(inArray(customersTable.id, effectiveIds));

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
    .where(and(...conditions));

  res.json(rows
    .filter(r => !r.completionDate)
    .map(r => ({
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
      status: r.nextDueDate && r.nextDueDate < todayStr && !r.completionDate ? "OVERDUE" : r.status,
      rawStatus: r.status,
      notes: r.notes ?? undefined,
      organizationId: r.organizationId,
      createdAt: r.createdAt.toISOString(),
    }))
  );
}));

router.get("/status-breakdown", asyncHandler(async (req, res) => {
  const orgId = req.user!.organizationId;
  const currentYear = dayjs().year();
  const todayBd = dayjs().format("YYYY-MM-DD");
  const customerIdParam = parseCustomerIdParam(req.query.customerId);

  const allowedIds = await getAccessibleCustomerIds(req.user!);
  const effectiveIds = getEffectiveIds(allowedIds, customerIdParam);
  if (effectiveIds !== null && effectiveIds.length === 0) {
    res.json(["NOT_STARTED", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "OVERDUE"].map(s => ({ status: s, count: 0 })));
    return;
  }

  const customerParam = effectiveIds !== null ? effectiveIds.join(",") : "";

  const result = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (
        WHERE i.status = 'NOT_STARTED'
          AND i.completion_date IS NULL
          AND i.next_due_date IS NOT NULL
          AND EXTRACT(YEAR FROM i.next_due_date::date) = ${currentYear}
      ) AS not_started,
      COUNT(*) FILTER (
        WHERE i.status = 'SCHEDULED'
          AND i.completion_date IS NULL
          AND i.scheduled_date IS NOT NULL
          AND EXTRACT(YEAR FROM i.scheduled_date::date) = ${currentYear}
      ) AS scheduled,
      COUNT(*) FILTER (
        WHERE i.status = 'IN_PROGRESS'
          AND i.completion_date IS NULL
          AND i.next_due_date IS NOT NULL
          AND EXTRACT(YEAR FROM i.next_due_date::date) = ${currentYear}
      ) AS in_progress,
      COUNT(*) FILTER (
        WHERE i.completion_date IS NOT NULL
          AND (
            (i.next_due_date IS NOT NULL AND EXTRACT(YEAR FROM i.next_due_date::date) = ${currentYear})
            OR
            (i.completion_date IS NOT NULL AND EXTRACT(YEAR FROM i.completion_date::date) = ${currentYear})
          )
      ) AS completed,
      COUNT(*) FILTER (
        WHERE i.completion_date IS NULL
          AND i.next_due_date IS NOT NULL
          AND EXTRACT(YEAR FROM i.next_due_date::date) = ${currentYear}
          AND i.next_due_date::date < ${todayBd}::date
      ) AS overdue
    FROM inspections i
    JOIN elevators e ON e.id = i.elevator_id
    JOIN buildings b ON b.id = e.building_id
    WHERE i.organization_id = ${orgId}
      AND (${customerParam} = '' OR b.customer_id = ANY(string_to_array(${customerParam}, ',')::int[]))
  `) as unknown as { rows: any[] };

  const row = result.rows[0] ?? {};
  res.json([
    { status: "NOT_STARTED", count: Number(row.not_started ?? 0) },
    { status: "SCHEDULED",   count: Number(row.scheduled   ?? 0) },
    { status: "IN_PROGRESS", count: Number(row.in_progress ?? 0) },
    { status: "COMPLETED",   count: Number(row.completed   ?? 0) },
    { status: "OVERDUE",     count: Number(row.overdue     ?? 0) },
  ]);
}));

router.get("/overdue-by-building", asyncHandler(async (req, res) => {
  const orgId = req.user!.organizationId;
  const todayObd = dayjs().format("YYYY-MM-DD");

  const allowedIds = await getAccessibleCustomerIds(req.user!);
  if (allowedIds !== null && allowedIds.length === 0) { res.json([]); return; }

  const conditions: any[] = [
    eq(inspectionsTable.organizationId, orgId),
    sql`${inspectionsTable.completionDate} IS NULL`,
    sql`${inspectionsTable.nextDueDate} IS NOT NULL AND ${inspectionsTable.nextDueDate}::date < ${todayObd}::date`,
  ];
  if (allowedIds !== null) conditions.push(inArray(customersTable.id, allowedIds));

  const rows = await db
    .select({
      buildingId: buildingsTable.id,
      buildingName: buildingsTable.name,
      customerName: customersTable.name,
      overdueCount: count(),
    })
    .from(inspectionsTable)
    .leftJoin(elevatorsTable, eq(inspectionsTable.elevatorId, elevatorsTable.id))
    .leftJoin(buildingsTable, eq(elevatorsTable.buildingId, buildingsTable.id))
    .leftJoin(customersTable, eq(buildingsTable.customerId, customersTable.id))
    .where(and(...conditions))
    .groupBy(buildingsTable.id, buildingsTable.name, customersTable.name)
    .having(({ overdueCount }) => gte(overdueCount, 1));

  res.json(rows.map(r => ({
    buildingId: r.buildingId ?? 0,
    buildingName: r.buildingName ?? "Unknown",
    customerName: r.customerName ?? undefined,
    overdueCount: Number(r.overdueCount),
  })));
}));

router.get("/monthly-forecast", asyncHandler(async (req, res) => {
  const orgId = req.user!.organizationId;
  const today = dayjs();
  const start = today.startOf("year");
  const customerIdParam = parseCustomerIdParam(req.query.customerId);

  const allowedIds = await getAccessibleCustomerIds(req.user!);
  const effectiveIds = getEffectiveIds(allowedIds, customerIdParam);
  if (effectiveIds !== null && effectiveIds.length === 0) {
    res.json([]);
    return;
  }

  const buildingCustomerFilter =
    effectiveIds !== null ? inArray(buildingsTable.customerId, effectiveIds) : undefined;

  const yearStart = start.format("YYYY-MM-DD");
  const yearEnd   = start.endOf("year").format("YYYY-MM-DD");

  const rows = await db
    .select({
      scheduledDate:  inspectionsTable.scheduledDate,
      completionDate: inspectionsTable.completionDate,
    })
    .from(inspectionsTable)
    .leftJoin(elevatorsTable, eq(inspectionsTable.elevatorId, elevatorsTable.id))
    .leftJoin(buildingsTable, eq(elevatorsTable.buildingId, buildingsTable.id))
    .where(and(
      eq(inspectionsTable.organizationId, orgId),
      sql`(
        (${inspectionsTable.scheduledDate}  IS NOT NULL
          AND ${inspectionsTable.scheduledDate}::date  >= ${yearStart}::date
          AND ${inspectionsTable.scheduledDate}::date  <= ${yearEnd}::date)
        OR
        (${inspectionsTable.completionDate} IS NOT NULL
          AND ${inspectionsTable.completionDate}::date >= ${yearStart}::date
          AND ${inspectionsTable.completionDate}::date <= ${yearEnd}::date)
      )`,
      buildingCustomerFilter,
    ));

  const months: { key: string; label: string; scheduled: number; completed: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const m = start.add(i, "month");
    months.push({ key: m.format("YYYY-MM"), label: m.format("MMM"), scheduled: 0, completed: 0 });
  }

  const findBucket = (dateStr: string | null | undefined) =>
    dateStr ? months.find(m => m.key === dateStr.substring(0, 7)) : undefined;

  for (const row of rows) {
    const scheduledBucket  = findBucket(row.scheduledDate);
    if (scheduledBucket)  scheduledBucket.scheduled++;

    const completedBucket  = findBucket(row.completionDate);
    if (completedBucket)  completedBucket.completed++;
  }

  res.json(months);
}));

router.get("/aging", asyncHandler(async (req, res) => {
  const orgId = req.user!.organizationId;
  const customerIdParam = parseCustomerIdParam(req.query.customerId);

  const allowedIds = await getAccessibleCustomerIds(req.user!);
  const effectiveIds = getEffectiveIds(allowedIds, customerIdParam);
  const EMPTY = (b: string, label: string, days: number) =>
    ({ bucket: b, label, days, notStarted: 0, scheduled: 0, inProgress: 0 });

  if (effectiveIds !== null && effectiveIds.length === 0) {
    res.json([
      EMPTY("due-future",    "Future (90+ Days)",    -91),
      EMPTY("due-today",     "Due Today",              0),
      EMPTY("due-1-7",       "Next 7 Days",           -1),
      EMPTY("due-8-14",      "Next 14 Days",          -8),
      EMPTY("due-15-30",     "Next 30 Days",         -15),
      EMPTY("due-31-60",     "Next 60 Days",         -31),
      EMPTY("due-61-90",     "Next 90 Days",         -61),
      EMPTY("overdue-1-30",  "Overdue 1–30 Days",     1),
      EMPTY("overdue-31-60", "Overdue 31–60 Days",   31),
      EMPTY("overdue-61-90", "Overdue 61–90 Days",   61),
      EMPTY("overdue-91+",   "Overdue 91+ Days",     91),
    ]);
    return;
  }

  const customerParam = effectiveIds !== null ? effectiveIds.join(",") : "";

  const rows = await db.execute(sql`
    SELECT
      CASE
        WHEN i.next_due_date::date > CURRENT_DATE + 90                                 THEN 'due-future'
        WHEN i.next_due_date::date = CURRENT_DATE                                      THEN 'due-today'
        WHEN i.next_due_date::date BETWEEN CURRENT_DATE + 1  AND CURRENT_DATE + 7     THEN 'due-1-7'
        WHEN i.next_due_date::date BETWEEN CURRENT_DATE + 8  AND CURRENT_DATE + 14    THEN 'due-8-14'
        WHEN i.next_due_date::date BETWEEN CURRENT_DATE + 15 AND CURRENT_DATE + 30    THEN 'due-15-30'
        WHEN i.next_due_date::date BETWEEN CURRENT_DATE + 31 AND CURRENT_DATE + 60    THEN 'due-31-60'
        WHEN i.next_due_date::date BETWEEN CURRENT_DATE + 61 AND CURRENT_DATE + 90    THEN 'due-61-90'
        WHEN CURRENT_DATE - i.next_due_date::date BETWEEN 1  AND 30                   THEN 'overdue-1-30'
        WHEN CURRENT_DATE - i.next_due_date::date BETWEEN 31 AND 60                   THEN 'overdue-31-60'
        WHEN CURRENT_DATE - i.next_due_date::date BETWEEN 61 AND 90                   THEN 'overdue-61-90'
        WHEN i.next_due_date::date < CURRENT_DATE - 90                                THEN 'overdue-91+'
      END AS bucket,
      i.status,
      COUNT(*) AS count
    FROM inspections i
    JOIN elevators e ON e.id = i.elevator_id
    JOIN buildings b ON b.id = e.building_id
    WHERE i.organization_id = ${orgId}
      AND i.completion_date IS NULL
      AND i.next_due_date   IS NOT NULL
      AND (${customerParam} = '' OR b.customer_id = ANY(string_to_array(${customerParam}, ',')::int[]))
    GROUP BY 1, i.status
  `) as unknown as { rows: { bucket: string; status: string; count: string }[] };

  const ORDER = ["due-future", "due-today", "due-1-7", "due-8-14", "due-15-30", "due-31-60", "due-61-90", "overdue-1-30", "overdue-31-60", "overdue-61-90", "overdue-91+"];
  const LABELS: Record<string, string> = {
    "due-future":    "Future (90+ Days)",
    "due-today":     "Due Today",
    "due-1-7":       "Next 7 Days",
    "due-8-14":      "Next 14 Days",
    "due-15-30":     "Next 30 Days",
    "due-31-60":     "Next 60 Days",
    "due-61-90":     "Next 90 Days",
    "overdue-1-30":  "Overdue 1–30 Days",
    "overdue-31-60": "Overdue 31–60 Days",
    "overdue-61-90": "Overdue 61–90 Days",
    "overdue-91+":   "Overdue 91+ Days",
  };
  const DAYS: Record<string, number> = {
    "due-future": -91, "due-today": 0, "due-1-7": -1, "due-8-14": -8, "due-15-30": -15, "due-31-60": -31, "due-61-90": -61,
    "overdue-1-30": 1, "overdue-31-60": 31, "overdue-61-90": 61, "overdue-91+": 91,
  };

  type BucketData = { bucket: string; label: string; days: number; notStarted: number; scheduled: number; inProgress: number };
  const bucketMap = new Map<string, BucketData>(
    ORDER.map(b => [b, EMPTY(b, LABELS[b], DAYS[b])])
  );

  for (const row of rows.rows) {
    const entry = bucketMap.get(row.bucket);
    if (!entry) continue;
    const n = Number(row.count);
    if (row.status === "NOT_STARTED")  entry.notStarted  += n;
    else if (row.status === "SCHEDULED")   entry.scheduled   += n;
    else if (row.status === "IN_PROGRESS") entry.inProgress  += n;
  }

  res.json(ORDER.map(b => bucketMap.get(b)!));
}));

export default router;
