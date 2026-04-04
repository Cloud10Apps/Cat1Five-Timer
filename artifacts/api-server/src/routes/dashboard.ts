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

  const buildingCustomerFilter = effectiveIds !== null ? inArray(buildingsTable.customerId, effectiveIds) : undefined;
  const baseCondition = and(eq(inspectionsTable.organizationId, orgId), buildingCustomerFilter);

  // NOT STARTED: status = NOT_STARTED AND nextDueDate in current year
  const notStartedQuery = db.select({ count: count() })
    .from(inspectionsTable)
    .leftJoin(elevatorsTable, eq(inspectionsTable.elevatorId, elevatorsTable.id))
    .leftJoin(buildingsTable, eq(elevatorsTable.buildingId, buildingsTable.id))
    .where(and(
      baseCondition,
      eq(inspectionsTable.status, "NOT_STARTED"),
      sql`${inspectionsTable.nextDueDate} IS NOT NULL AND EXTRACT(YEAR FROM ${inspectionsTable.nextDueDate}::date) = ${currentYear}`,
    ));

  // SCHEDULED: any inspection with a scheduledDate in current year, regardless of status
  const scheduledQuery = db.select({ count: count() })
    .from(inspectionsTable)
    .leftJoin(elevatorsTable, eq(inspectionsTable.elevatorId, elevatorsTable.id))
    .leftJoin(buildingsTable, eq(elevatorsTable.buildingId, buildingsTable.id))
    .where(and(
      baseCondition,
      sql`${inspectionsTable.scheduledDate} IS NOT NULL AND EXTRACT(YEAR FROM ${inspectionsTable.scheduledDate}::date) = ${currentYear}`,
    ));

  // IN PROGRESS: status = IN_PROGRESS only (no date filter)
  const inProgressQuery = db.select({ count: count() })
    .from(inspectionsTable)
    .leftJoin(elevatorsTable, eq(inspectionsTable.elevatorId, elevatorsTable.id))
    .leftJoin(buildingsTable, eq(elevatorsTable.buildingId, buildingsTable.id))
    .where(and(baseCondition, eq(inspectionsTable.status, "IN_PROGRESS")));

  // COMPLETED: any inspection with a completionDate in current year (any status)
  const completedQuery = db.select({ count: count() })
    .from(inspectionsTable)
    .leftJoin(elevatorsTable, eq(inspectionsTable.elevatorId, elevatorsTable.id))
    .leftJoin(buildingsTable, eq(elevatorsTable.buildingId, buildingsTable.id))
    .where(and(
      baseCondition,
      sql`${inspectionsTable.completionDate} IS NOT NULL AND EXTRACT(YEAR FROM ${inspectionsTable.completionDate}::date) = ${currentYear}`,
    ));

  // OVERDUE: no completionDate AND nextDueDate is in the past
  const overdueQuery = db.select({ count: count() })
    .from(inspectionsTable)
    .leftJoin(elevatorsTable, eq(inspectionsTable.elevatorId, elevatorsTable.id))
    .leftJoin(buildingsTable, eq(elevatorsTable.buildingId, buildingsTable.id))
    .where(and(
      baseCondition,
      sql`${inspectionsTable.completionDate} IS NULL`,
      sql`${inspectionsTable.nextDueDate} IS NOT NULL AND ${inspectionsTable.nextDueDate}::date < ${todayStr}::date`,
    ));

  // Avg Days to Schedule: AVG(scheduledDate - nextDueDate) for inspections with scheduledDate this year
  const avgScheduleQuery = db.select({
    avg: sql<string>`AVG(${inspectionsTable.scheduledDate}::date - ${inspectionsTable.nextDueDate}::date)`,
  })
    .from(inspectionsTable)
    .leftJoin(elevatorsTable, eq(inspectionsTable.elevatorId, elevatorsTable.id))
    .leftJoin(buildingsTable, eq(elevatorsTable.buildingId, buildingsTable.id))
    .where(and(
      baseCondition,
      sql`${inspectionsTable.scheduledDate} IS NOT NULL AND ${inspectionsTable.nextDueDate} IS NOT NULL`,
      sql`EXTRACT(YEAR FROM ${inspectionsTable.scheduledDate}::date) = ${currentYear}`,
    ));

  // Avg Days to Complete: AVG(completionDate - nextDueDate) for inspections with completionDate this year
  const avgCompleteQuery = db.select({
    avg: sql<string>`AVG(${inspectionsTable.completionDate}::date - ${inspectionsTable.nextDueDate}::date)`,
  })
    .from(inspectionsTable)
    .leftJoin(elevatorsTable, eq(inspectionsTable.elevatorId, elevatorsTable.id))
    .leftJoin(buildingsTable, eq(elevatorsTable.buildingId, buildingsTable.id))
    .where(and(
      baseCondition,
      sql`${inspectionsTable.completionDate} IS NOT NULL AND ${inspectionsTable.nextDueDate} IS NOT NULL`,
      sql`EXTRACT(YEAR FROM ${inspectionsTable.completionDate}::date) = ${currentYear}`,
    ));

  const [
    [notStartedRow],
    [scheduledRow],
    [inProgressRow],
    [completedRow],
    [overdueRow],
    [avgScheduleRow],
    [avgCompleteRow],
  ] = await Promise.all([
    notStartedQuery,
    scheduledQuery,
    inProgressQuery,
    completedQuery,
    overdueQuery,
    avgScheduleQuery,
    avgCompleteQuery,
  ]);

  const parseAvg = (val: string | null): number | null =>
    val == null ? null : parseFloat(parseFloat(val).toFixed(1));

  res.json({
    notStartedCount:    Number(notStartedRow.count),
    scheduledCount:     Number(scheduledRow.count),
    inProgressCount:    Number(inProgressRow.count),
    completedCount:     Number(completedRow.count),
    overdueCount:       Number(overdueRow.count),
    avgDaysToSchedule:  parseAvg(avgScheduleRow?.avg ?? null),
    avgDaysToComplete:  parseAvg(avgCompleteRow?.avg ?? null),
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

  const buildingCustomerFilter = effectiveIds !== null ? inArray(buildingsTable.customerId, effectiveIds) : undefined;
  const baseC = and(eq(inspectionsTable.organizationId, orgId), buildingCustomerFilter);

  const dueDateYearFilter = sql`EXTRACT(YEAR FROM ${inspectionsTable.nextDueDate}::date) = ${currentYear}`;
  const completionYearFilter = sql`EXTRACT(YEAR FROM ${inspectionsTable.completionDate}::date) = ${currentYear}`;

  const makeStatusQuery = (status: string) => {
    if (status === "SCHEDULED") {
      // Scheduled = any inspection with a scheduledDate in current year, regardless of status
      return db.select({ count: count() })
        .from(inspectionsTable)
        .leftJoin(elevatorsTable, eq(inspectionsTable.elevatorId, elevatorsTable.id))
        .leftJoin(buildingsTable, eq(elevatorsTable.buildingId, buildingsTable.id))
        .where(and(
          baseC,
          sql`${inspectionsTable.scheduledDate} IS NOT NULL AND EXTRACT(YEAR FROM ${inspectionsTable.scheduledDate}::date) = ${currentYear}`,
        ));
    }
    const dateFilter = status === "COMPLETED" ? completionYearFilter : dueDateYearFilter;
    return db.select({ count: count() })
      .from(inspectionsTable)
      .leftJoin(elevatorsTable, eq(inspectionsTable.elevatorId, elevatorsTable.id))
      .leftJoin(buildingsTable, eq(elevatorsTable.buildingId, buildingsTable.id))
      .where(and(baseC, eq(inspectionsTable.status, status), dateFilter));
  };

  const storedResults = await Promise.all(
    ["NOT_STARTED", "SCHEDULED", "IN_PROGRESS", "COMPLETED"].map(async (status) => {
      const [row] = await makeStatusQuery(status);
      return { status, count: Number(row.count) };
    })
  );

  // Overdue = all past-due open (no completion date), regardless of year
  const [overdueRow] = await db.select({ count: count() })
    .from(inspectionsTable)
    .leftJoin(elevatorsTable, eq(inspectionsTable.elevatorId, elevatorsTable.id))
    .leftJoin(buildingsTable, eq(elevatorsTable.buildingId, buildingsTable.id))
    .where(and(
      baseC,
      sql`${inspectionsTable.completionDate} IS NULL`,
      sql`${inspectionsTable.nextDueDate} IS NOT NULL AND ${inspectionsTable.nextDueDate}::date < ${todayBd}::date`,
    ));

  res.json([...storedResults, { status: "OVERDUE", count: Number(overdueRow.count) }]);
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
      EMPTY("Current", "Current",             0),
      EMPTY("1–30",    "Overdue 1–30 Days",   1),
      EMPTY("31–60",   "Overdue 31–60 Days",  31),
      EMPTY("61–90",   "Overdue 61–90 Days",  61),
      EMPTY("91–120",  "Overdue 91–120 Days", 91),
      EMPTY("121+",    "Overdue 121+ Days",   121),
    ]);
    return;
  }

  // Count every open inspection record (no per-elevator deduplication) so totals
  // align with the Overdue Inspections table on the same dashboard.
  const customerClause = effectiveIds !== null && effectiveIds.length > 0
    ? sql`AND b.customer_id = ANY(ARRAY[${sql.join(effectiveIds.map(id => sql`${id}`), sql`, `)}])`
    : sql``;

  const rows = await db.execute(sql`
    SELECT
      CASE
        WHEN i.next_due_date::date >= CURRENT_DATE                           THEN 'Current'
        WHEN CURRENT_DATE - i.next_due_date::date BETWEEN 1  AND 30         THEN '1–30'
        WHEN CURRENT_DATE - i.next_due_date::date BETWEEN 31 AND 60         THEN '31–60'
        WHEN CURRENT_DATE - i.next_due_date::date BETWEEN 61 AND 90         THEN '61–90'
        WHEN CURRENT_DATE - i.next_due_date::date BETWEEN 91 AND 120        THEN '91–120'
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
      ${customerClause}
    GROUP BY 1, i.status
  `) as unknown as { rows: { bucket: string; status: string; count: string }[] };

  const ORDER = ["Current", "1–30", "31–60", "61–90", "91–120", "121+"];
  const LABELS: Record<string, string> = {
    "Current": "Current",
    "1–30":    "Overdue 1–30 Days",
    "31–60":   "Overdue 31–60 Days",
    "61–90":   "Overdue 61–90 Days",
    "91–120":  "Overdue 91–120 Days",
    "121+":    "Overdue 121+ Days",
  };
  const DAYS: Record<string, number> = { "Current": 0, "1–30": 1, "31–60": 31, "61–90": 61, "91–120": 91, "121+": 121 };

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
