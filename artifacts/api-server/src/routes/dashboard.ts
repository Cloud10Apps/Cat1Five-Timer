import { Router } from "express";
import { db, inspectionsTable, elevatorsTable, buildingsTable, customersTable } from "@workspace/db";
import { eq, and, count, ne, gte, inArray, sql } from "drizzle-orm";
import dayjs from "dayjs";
import { requireAuth } from "../middleware/auth.js";
import { getAccessibleCustomerIds } from "../lib/user-access.js";

const router = Router();

router.use(requireAuth);

function getEffectiveIds(allowedIds: number[] | null, customerIdParam: number | null): number[] | null {
  if (customerIdParam === null) return allowedIds;
  if (allowedIds === null) return [customerIdParam];
  return allowedIds.includes(customerIdParam) ? [customerIdParam] : [];
}

router.get("/summary", async (req, res) => {
  const orgId = req.user!.organizationId;
  const customerIdParam = req.query.customerId ? parseInt(req.query.customerId as string) : null;

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
  // Pass IDs as a comma-separated string; empty string means "no filter".
  // This avoids Drizzle expanding arrays into ($2,$3,...) which breaks ::int[] casts.
  const customerParam = effectiveIds !== null ? effectiveIds.join(",") : "";

  // Single-pass query using COUNT(*) FILTER to replace 7 separate round-trips
  const result = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (
        WHERE i.status = 'NOT_STARTED'
          AND i.completion_date IS NULL
          AND i.next_due_date IS NOT NULL
          AND i.next_due_date::date >= ${todayStr}::date
      ) AS not_started,
      COUNT(*) FILTER (
        WHERE i.status = 'SCHEDULED'
          AND i.completion_date IS NULL
          AND i.next_due_date IS NOT NULL
          AND i.next_due_date::date >= ${todayStr}::date
      ) AS scheduled,
      COUNT(*) FILTER (WHERE i.status = 'IN_PROGRESS' AND i.completion_date IS NULL) AS in_progress,
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
});

router.get("/attention", async (req, res) => {
  const orgId = req.user!.organizationId;
  const today = dayjs();
  const todayStr = today.format("YYYY-MM-DD");
  const currentYear = today.year();
  const customerIdParam = req.query.customerId ? parseInt(req.query.customerId as string) : null;

  const allowedIds = await getAccessibleCustomerIds(req.user!);
  const effectiveIds = getEffectiveIds(allowedIds, customerIdParam);
  if (effectiveIds !== null && effectiveIds.length === 0) { res.json([]); return; }

  // Include: (a) all past-due non-completed from any year (overdue),
  //          (b) all non-completed inspections due in the current year
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
});

router.get("/status-breakdown", async (req, res) => {
  const orgId = req.user!.organizationId;
  const currentYear = dayjs().year();
  const todayBd = dayjs().format("YYYY-MM-DD");
  const customerIdParam = req.query.customerId ? parseInt(req.query.customerId as string) : null;

  const allowedIds = await getAccessibleCustomerIds(req.user!);
  const effectiveIds = getEffectiveIds(allowedIds, customerIdParam);
  if (effectiveIds !== null && effectiveIds.length === 0) {
    res.json(["NOT_STARTED", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "OVERDUE"].map(s => ({ status: s, count: 0 })));
    return;
  }

  const customerParam = effectiveIds !== null ? effectiveIds.join(",") : "";

  // Single-pass query replacing 5 separate round-trips
  const result = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (
        WHERE i.status = 'NOT_STARTED'
          AND i.completion_date IS NULL
          AND i.next_due_date IS NOT NULL
          AND i.next_due_date::date >= ${todayBd}::date
      ) AS not_started,
      COUNT(*) FILTER (
        WHERE i.status = 'SCHEDULED'
          AND i.completion_date IS NULL
          AND i.next_due_date IS NOT NULL
          AND i.next_due_date::date >= ${todayBd}::date
      ) AS scheduled,
      COUNT(*) FILTER (
        WHERE i.status = 'IN_PROGRESS'
          AND i.completion_date IS NULL
      ) AS in_progress,
      COUNT(*) FILTER (
        WHERE i.completion_date IS NOT NULL
          AND EXTRACT(YEAR FROM i.completion_date::date) = ${currentYear}
      ) AS completed,
      COUNT(*) FILTER (
        WHERE i.completion_date IS NULL
          AND i.next_due_date IS NOT NULL
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
});

router.get("/overdue-by-building", async (req, res) => {
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
});

router.get("/monthly-forecast", async (req, res) => {
  const orgId = req.user!.organizationId;
  const today = dayjs();
  const start = today.startOf("year");
  const customerIdParam = req.query.customerId ? parseInt(req.query.customerId as string) : null;

  const allowedIds = await getAccessibleCustomerIds(req.user!);
  const effectiveIds = getEffectiveIds(allowedIds, customerIdParam);
  if (effectiveIds !== null && effectiveIds.length === 0) {
    res.json([]);
    return;
  }

  const buildingCustomerFilter =
    effectiveIds !== null ? inArray(buildingsTable.customerId, effectiveIds) : undefined;

  const rows = await db
    .select({
      nextDueDate: inspectionsTable.nextDueDate,
      scheduledDate: inspectionsTable.scheduledDate,
      completionDate: inspectionsTable.completionDate,
      status: inspectionsTable.status,
    })
    .from(inspectionsTable)
    .leftJoin(elevatorsTable, eq(inspectionsTable.elevatorId, elevatorsTable.id))
    .leftJoin(buildingsTable, eq(elevatorsTable.buildingId, buildingsTable.id))
    .where(and(eq(inspectionsTable.organizationId, orgId), buildingCustomerFilter));

  const months: { key: string; label: string; notStarted: number; scheduled: number; inProgress: number; completed: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const m = start.add(i, "month");
    months.push({ key: m.format("YYYY-MM"), label: m.format("MMM"), notStarted: 0, scheduled: 0, inProgress: 0, completed: 0 });
  }

  const todayStr = today.format("YYYY-MM-DD");

  for (const row of rows) {
    if (!row.nextDueDate) continue;
    const dueBucket = months.find((m) => m.key === row.nextDueDate!.substring(0, 7));
    if (!dueBucket) continue; // outside current year — skip

    if (row.completionDate) {
      // Completed: inspection has been finished — bucket by the month it was due
      dueBucket.completed++;
    } else if (row.nextDueDate < todayStr) {
      // Overdue (past due, no completion): count as not started for visibility
      dueBucket.notStarted++;
    } else if (row.status === "SCHEDULED") {
      dueBucket.scheduled++;
    } else if (row.status === "IN_PROGRESS") {
      dueBucket.inProgress++;
    } else if (row.status === "NOT_STARTED") {
      dueBucket.notStarted++;
    }
  }

  res.json(months);
});

router.get("/aging", async (req, res) => {
  const orgId = req.user!.organizationId;
  const customerIdParam = req.query.customerId ? parseInt(req.query.customerId as string) : null;

  const allowedIds = await getAccessibleCustomerIds(req.user!);
  const effectiveIds = getEffectiveIds(allowedIds, customerIdParam);
  const EMPTY = (b: string, label: string, days: number) =>
    ({ bucket: b, label, days, notStarted: 0, scheduled: 0, inProgress: 0 });

  if (effectiveIds !== null && effectiveIds.length === 0) {
    res.json([
      EMPTY("due-today",     "Due Today",             0),
      EMPTY("due-1-7",       "Due in 1–7 Days",      -1),
      EMPTY("due-8-14",      "Due in 8–14 Days",     -8),
      EMPTY("due-15-30",     "Due in 15–30 Days",   -15),
      EMPTY("due-31-60",     "Due in 31–60 Days",   -31),
      EMPTY("due-61-90",     "Due in 61–90 Days",   -61),
      EMPTY("overdue-1-30",  "Overdue 1–30 Days",     1),
      EMPTY("overdue-31-60", "Overdue 31–60 Days",   31),
      EMPTY("overdue-61-90", "Overdue 61–90 Days",   61),
      EMPTY("overdue-91+",   "Overdue 91+ Days",     91),
    ]);
    return;
  }

  // Pass IDs as a comma-separated string to avoid Drizzle expanding arrays into ($2,$3,...)
  const customerParam = effectiveIds !== null ? effectiveIds.join(",") : "";

  const rows = await db.execute(sql`
    SELECT
      CASE
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

  const ORDER = ["due-today", "due-1-7", "due-8-14", "due-15-30", "due-31-60", "due-61-90", "overdue-1-30", "overdue-31-60", "overdue-61-90", "overdue-91+"];
  const LABELS: Record<string, string> = {
    "due-today":     "Due Today",
    "due-1-7":       "Due in 1–7 Days",
    "due-8-14":      "Due in 8–14 Days",
    "due-15-30":     "Due in 15–30 Days",
    "due-31-60":     "Due in 31–60 Days",
    "due-61-90":     "Due in 61–90 Days",
    "overdue-1-30":  "Overdue 1–30 Days",
    "overdue-31-60": "Overdue 31–60 Days",
    "overdue-61-90": "Overdue 61–90 Days",
    "overdue-91+":   "Overdue 91+ Days",
  };
  const DAYS: Record<string, number> = {
    "due-today": 0, "due-1-7": -1, "due-8-14": -8, "due-15-30": -15, "due-31-60": -31, "due-61-90": -61,
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
});

export default router;
