import { Router } from "express";
import { db, inspectionsTable, elevatorsTable, buildingsTable, customersTable } from "@workspace/db";
import { eq, and, count, ne, gte, inArray, sql } from "drizzle-orm";
import dayjs from "dayjs";
import { requireAuth } from "../middleware/auth.js";
import { getAccessibleCustomerIds } from "../lib/user-access.js";

const router = Router();

router.use(requireAuth);

router.get("/summary", async (req, res) => {
  const orgId = req.user!.organizationId;

  const allowedIds = await getAccessibleCustomerIds(req.user!);

  if (allowedIds !== null && allowedIds.length === 0) {
    res.json({
      notStartedCount: 0, scheduledCount: 0, inProgressCount: 0,
      completedCount: 0, overdueCount: 0,
      avgDaysToSchedule: null, avgDaysToComplete: null,
    });
    return;
  }

  const currentYear = dayjs().year();
  const todayStr = dayjs().format("YYYY-MM-DD");

  const buildingCustomerFilter = allowedIds !== null ? inArray(buildingsTable.customerId, allowedIds) : undefined;
  const baseCondition = and(eq(inspectionsTable.organizationId, orgId), buildingCustomerFilter);

  // Non-completed statuses: filter by nextDueDate in current year
  const dueDateYearFilter = sql`EXTRACT(YEAR FROM ${inspectionsTable.nextDueDate}::date) = ${currentYear}`;

  // Completed: filter by completionDate in current year
  const completionYearFilter = sql`EXTRACT(YEAR FROM ${inspectionsTable.completionDate}::date) = ${currentYear}`;

  const makeCountQuery = (status: string) => {
    const dateFilter = status === "COMPLETED" ? completionYearFilter : dueDateYearFilter;
    return db.select({ count: count() })
      .from(inspectionsTable)
      .leftJoin(elevatorsTable, eq(inspectionsTable.elevatorId, elevatorsTable.id))
      .leftJoin(buildingsTable, eq(elevatorsTable.buildingId, buildingsTable.id))
      .where(and(baseCondition, eq(inspectionsTable.status, status), dateFilter));
  };

  // Overdue = not completed + nextDueDate in current year + past due today
  const overdueQuery = db.select({ count: count() })
    .from(inspectionsTable)
    .leftJoin(elevatorsTable, eq(inspectionsTable.elevatorId, elevatorsTable.id))
    .leftJoin(buildingsTable, eq(elevatorsTable.buildingId, buildingsTable.id))
    .where(and(
      baseCondition,
      ne(inspectionsTable.status, "COMPLETED"),
      dueDateYearFilter,
      sql`${inspectionsTable.nextDueDate} IS NOT NULL AND ${inspectionsTable.nextDueDate}::date < ${todayStr}::date`,
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
    makeCountQuery("NOT_STARTED"),
    makeCountQuery("SCHEDULED"),
    makeCountQuery("IN_PROGRESS"),
    makeCountQuery("COMPLETED"),
    overdueQuery,
    // avg(scheduled_date - next_due_date) for current-year inspections
    db.select({
      avg: sql<string>`AVG(${inspectionsTable.scheduledDate}::date - ${inspectionsTable.nextDueDate}::date)`,
    })
      .from(inspectionsTable)
      .leftJoin(elevatorsTable, eq(inspectionsTable.elevatorId, elevatorsTable.id))
      .leftJoin(buildingsTable, eq(elevatorsTable.buildingId, buildingsTable.id))
      .where(and(baseCondition, dueDateYearFilter, sql`${inspectionsTable.scheduledDate} IS NOT NULL AND ${inspectionsTable.nextDueDate} IS NOT NULL`)),
    // avg(completion_date - next_due_date) for COMPLETED inspections this year
    db.select({
      avg: sql<string>`AVG(${inspectionsTable.completionDate}::date - ${inspectionsTable.nextDueDate}::date)`,
    })
      .from(inspectionsTable)
      .leftJoin(elevatorsTable, eq(inspectionsTable.elevatorId, elevatorsTable.id))
      .leftJoin(buildingsTable, eq(elevatorsTable.buildingId, buildingsTable.id))
      .where(and(baseCondition, eq(inspectionsTable.status, "COMPLETED"), completionYearFilter, sql`${inspectionsTable.completionDate} IS NOT NULL AND ${inspectionsTable.nextDueDate} IS NOT NULL`)),
  ]);

  const parseAvg = (val: string | null): number | null =>
    val == null ? null : Math.round(parseFloat(val));

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
  const in30Days = today.add(30, "day").format("YYYY-MM-DD");
  const todayStr = today.format("YYYY-MM-DD");

  const allowedIds = await getAccessibleCustomerIds(req.user!);
  if (allowedIds !== null && allowedIds.length === 0) { res.json([]); return; }

  const conditions: any[] = [
    eq(inspectionsTable.organizationId, orgId),
    sql`${inspectionsTable.nextDueDate} IS NOT NULL AND ${inspectionsTable.nextDueDate}::date <= ${in30Days}::date`,
  ];
  if (allowedIds !== null) conditions.push(inArray(customersTable.id, allowedIds));

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
    .filter(r => r.status !== "COMPLETED")
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
      status: r.nextDueDate && r.nextDueDate < todayStr && r.status !== "COMPLETED" ? "OVERDUE" : r.status,
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

  const allowedIds = await getAccessibleCustomerIds(req.user!);
  if (allowedIds !== null && allowedIds.length === 0) {
    res.json(["NOT_STARTED", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "OVERDUE"].map(s => ({ status: s, count: 0 })));
    return;
  }

  const buildingCustomerFilter = allowedIds !== null ? inArray(buildingsTable.customerId, allowedIds) : undefined;
  const baseC = and(eq(inspectionsTable.organizationId, orgId), buildingCustomerFilter);

  const dueDateYearFilter = sql`EXTRACT(YEAR FROM ${inspectionsTable.nextDueDate}::date) = ${currentYear}`;
  const completionYearFilter = sql`EXTRACT(YEAR FROM ${inspectionsTable.completionDate}::date) = ${currentYear}`;

  const storedStatuses = ["NOT_STARTED", "SCHEDULED", "IN_PROGRESS", "COMPLETED"];

  const storedResults = await Promise.all(storedStatuses.map(async (status) => {
    const dateFilter = status === "COMPLETED" ? completionYearFilter : dueDateYearFilter;
    const [row] = await db
      .select({ count: count() })
      .from(inspectionsTable)
      .leftJoin(elevatorsTable, eq(inspectionsTable.elevatorId, elevatorsTable.id))
      .leftJoin(buildingsTable, eq(elevatorsTable.buildingId, buildingsTable.id))
      .where(and(baseC, eq(inspectionsTable.status, status), dateFilter));
    return { status, count: Number(row.count) };
  }));

  // Overdue = not completed + due in current year + past due today
  const [overdueRow] = await db.select({ count: count() })
    .from(inspectionsTable)
    .leftJoin(elevatorsTable, eq(inspectionsTable.elevatorId, elevatorsTable.id))
    .leftJoin(buildingsTable, eq(elevatorsTable.buildingId, buildingsTable.id))
    .where(and(
      baseC,
      ne(inspectionsTable.status, "COMPLETED"),
      dueDateYearFilter,
      sql`${inspectionsTable.nextDueDate} IS NOT NULL AND ${inspectionsTable.nextDueDate}::date < ${todayBd}::date`,
    ));

  res.json([...storedResults, { status: "OVERDUE", count: Number(overdueRow.count) }]);
});

router.get("/overdue-by-building", async (req, res) => {
  const orgId = req.user!.organizationId;
  const currentYear = dayjs().year();
  const todayObd = dayjs().format("YYYY-MM-DD");

  const allowedIds = await getAccessibleCustomerIds(req.user!);
  if (allowedIds !== null && allowedIds.length === 0) { res.json([]); return; }

  const conditions: any[] = [
    eq(inspectionsTable.organizationId, orgId),
    ne(inspectionsTable.status, "COMPLETED"),
    sql`EXTRACT(YEAR FROM ${inspectionsTable.nextDueDate}::date) = ${currentYear}`,
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

  const allowedIds = await getAccessibleCustomerIds(req.user!);
  if (allowedIds !== null && allowedIds.length === 0) {
    res.json([]);
    return;
  }

  const buildingCustomerFilter =
    allowedIds !== null ? inArray(buildingsTable.customerId, allowedIds) : undefined;

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

  const months: { key: string; label: string; due: number; scheduled: number; completed: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const m = start.add(i, "month");
    months.push({ key: m.format("YYYY-MM"), label: m.format("MMM YYYY"), due: 0, scheduled: 0, completed: 0 });
  }

  for (const row of rows) {
    if (row.nextDueDate) {
      const key = row.nextDueDate.substring(0, 7);
      const bucket = months.find((m) => m.key === key);
      if (bucket) bucket.due++;
    }
    if (row.scheduledDate && row.status === "SCHEDULED") {
      const key = row.scheduledDate.substring(0, 7);
      const bucket = months.find((m) => m.key === key);
      if (bucket) bucket.scheduled++;
    }
    if (row.completionDate && row.status === "COMPLETED") {
      const key = row.completionDate.substring(0, 7);
      const bucket = months.find((m) => m.key === key);
      if (bucket) bucket.completed++;
    }
  }

  res.json(months);
});

export default router;
