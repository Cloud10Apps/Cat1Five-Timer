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
          AND i.next_due_date IS NOT NULL
          AND EXTRACT(YEAR FROM i.next_due_date::date) = ${currentYear}
      ) AS not_started,
      COUNT(*) FILTER (
        WHERE i.scheduled_date IS NOT NULL
          AND EXTRACT(YEAR FROM i.scheduled_date::date) = ${currentYear}
      ) AS scheduled,
      COUNT(*) FILTER (WHERE i.status = 'IN_PROGRESS') AS in_progress,
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
          AND i.next_due_date IS NOT NULL
          AND EXTRACT(YEAR FROM i.next_due_date::date) = ${currentYear}
      ) AS not_started,
      COUNT(*) FILTER (
        WHERE i.scheduled_date IS NOT NULL
          AND EXTRACT(YEAR FROM i.scheduled_date::date) = ${currentYear}
      ) AS scheduled,
      COUNT(*) FILTER (
        WHERE i.status = 'IN_PROGRESS'
          AND i.next_due_date IS NOT NULL
          AND EXTRACT(YEAR FROM i.next_due_date::date) = ${currentYear}
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

  for (const row of rows) {
    // Not Started: status = NOT_STARTED, bucket by nextDueDate
    if (row.status === "NOT_STARTED" && row.nextDueDate) {
      const bucket = months.find((m) => m.key === row.nextDueDate!.substring(0, 7));
      if (bucket) bucket.notStarted++;
    }
    // Scheduled: any inspection with a scheduledDate — bucket by scheduledDate month
    // (months array is current-year only, so out-of-year dates find no bucket)
    if (row.scheduledDate) {
      const bucket = months.find((m) => m.key === row.scheduledDate!.substring(0, 7));
      if (bucket) bucket.scheduled++;
    }
    // In Progress: status = IN_PROGRESS, bucket by nextDueDate
    if (row.status === "IN_PROGRESS" && row.nextDueDate) {
      const bucket = months.find((m) => m.key === row.nextDueDate!.substring(0, 7));
      if (bucket) bucket.inProgress++;
    }
    // Completed: has a completionDate, bucket by completionDate
    if (row.completionDate) {
      const bucket = months.find((m) => m.key === row.completionDate!.substring(0, 7));
      if (bucket) bucket.completed++;
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
      EMPTY("Current", "Not Yet Due",          0),
      EMPTY("1-30",    "Overdue 1-30 Days",    1),
      EMPTY("31-60",   "Overdue 31-60 Days",  31),
      EMPTY("61-90",   "Overdue 61-90 Days",  61),
      EMPTY("91-120",  "Overdue 91-120 Days", 91),
      EMPTY("121+",    "Overdue 121+ Days",  121),
    ]);
    return;
  }

  // Pass IDs as a comma-separated string to avoid Drizzle expanding arrays into ($2,$3,...)
  const customerParam = effectiveIds !== null ? effectiveIds.join(",") : "";

  const rows = await db.execute(sql`
    SELECT
      CASE
        WHEN i.next_due_date::date >= CURRENT_DATE                           THEN 'Current'
        WHEN CURRENT_DATE - i.next_due_date::date BETWEEN 1  AND 30         THEN '1-30'
        WHEN CURRENT_DATE - i.next_due_date::date BETWEEN 31 AND 60         THEN '31-60'
        WHEN CURRENT_DATE - i.next_due_date::date BETWEEN 61 AND 90         THEN '61-90'
        WHEN CURRENT_DATE - i.next_due_date::date BETWEEN 91 AND 120        THEN '91-120'
        ELSE '121+'
      END AS bucket,
      i.status,
      COUNT(*) AS count
    FROM inspections i
    JOIN elevators e ON e.id = i.elevator_id
    JOIN buildings b ON b.id = e.building_id
    WHERE i.organization_id = ${orgId}
      AND i.completion_date IS NULL
      AND i.next_due_date   IS NOT NULL
      AND (
        i.next_due_date::date < CURRENT_DATE
        OR EXTRACT(YEAR FROM i.next_due_date::date) = EXTRACT(YEAR FROM CURRENT_DATE)
      )
      AND (${customerParam} = '' OR b.customer_id = ANY(string_to_array(${customerParam}, ',')::int[]))
    GROUP BY 1, i.status
  `) as unknown as { rows: { bucket: string; status: string; count: string }[] };

  const ORDER = ["Current", "1-30", "31-60", "61-90", "91-120", "121+"];
  const LABELS: Record<string, string> = {
    "Current": "Not Yet Due",
    "1-30":    "Overdue 1-30 Days",
    "31-60":   "Overdue 31-60 Days",
    "61-90":   "Overdue 61-90 Days",
    "91-120":  "Overdue 91-120 Days",
    "121+":    "Overdue 121+ Days",
  };
  const DAYS: Record<string, number> = { "Current": 0, "1-30": 1, "31-60": 31, "61-90": 61, "91-120": 91, "121+": 121 };

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
