import { Router } from "express";
import { db, inspectionsTable, elevatorsTable, buildingsTable, customersTable } from "@workspace/db";
import { eq, and, count, gte, lte, inArray } from "drizzle-orm";
import dayjs from "dayjs";
import { requireAuth } from "../middleware/auth.js";
import { getAccessibleCustomerIds } from "../lib/user-access.js";

const router = Router();

router.use(requireAuth);

router.get("/summary", async (req, res) => {
  const orgId = req.user!.organizationId;
  const today = dayjs();
  const monthStart = today.startOf("month").format("YYYY-MM-DD");
  const monthEnd = today.endOf("month").format("YYYY-MM-DD");

  const allowedIds = await getAccessibleCustomerIds(req.user!);

  if (allowedIds !== null && allowedIds.length === 0) {
    res.json({ totalElevators: 0, duethisMonth: 0, overdueCount: 0, scheduledCount: 0, totalCustomers: 0, totalBuildings: 0 });
    return;
  }

  const customerFilter = allowedIds !== null ? inArray(customersTable.id, allowedIds) : undefined;
  const buildingCustomerFilter = allowedIds !== null ? inArray(buildingsTable.customerId, allowedIds) : undefined;

  const [elevatorCount] = await db
    .select({ count: count() })
    .from(elevatorsTable)
    .leftJoin(buildingsTable, eq(elevatorsTable.buildingId, buildingsTable.id))
    .where(and(eq(elevatorsTable.organizationId, orgId), buildingCustomerFilter));

  const [customerCount] = await db
    .select({ count: count() })
    .from(customersTable)
    .where(and(eq(customersTable.organizationId, orgId), customerFilter));

  const [buildingCount] = await db
    .select({ count: count() })
    .from(buildingsTable)
    .where(and(eq(buildingsTable.organizationId, orgId), buildingCustomerFilter));

  const inspectionBase = db
    .select({ count: count() })
    .from(inspectionsTable)
    .leftJoin(elevatorsTable, eq(inspectionsTable.elevatorId, elevatorsTable.id))
    .leftJoin(buildingsTable, eq(elevatorsTable.buildingId, buildingsTable.id));

  const [overdueCount] = await inspectionBase.where(
    and(eq(inspectionsTable.organizationId, orgId), eq(inspectionsTable.status, "OVERDUE"), buildingCustomerFilter)
  );
  const [scheduledCount] = await inspectionBase.where(
    and(eq(inspectionsTable.organizationId, orgId), eq(inspectionsTable.status, "SCHEDULED"), buildingCustomerFilter)
  );
  const [dueThisMonth] = await inspectionBase.where(
    and(eq(inspectionsTable.organizationId, orgId), gte(inspectionsTable.nextDueDate, monthStart), lte(inspectionsTable.nextDueDate, monthEnd), buildingCustomerFilter)
  );

  res.json({
    totalElevators: Number(elevatorCount.count),
    duethisMonth: Number(dueThisMonth.count),
    overdueCount: Number(overdueCount.count),
    scheduledCount: Number(scheduledCount.count),
    totalCustomers: Number(customerCount.count),
    totalBuildings: Number(buildingCount.count),
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
    lte(inspectionsTable.nextDueDate, in30Days),
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

  const allowedIds = await getAccessibleCustomerIds(req.user!);
  if (allowedIds !== null && allowedIds.length === 0) {
    res.json(["NOT_STARTED", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "OVERDUE"].map(s => ({ status: s, count: 0 })));
    return;
  }

  const buildingCustomerFilter = allowedIds !== null ? inArray(buildingsTable.customerId, allowedIds) : undefined;
  const statuses = ["NOT_STARTED", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "OVERDUE"];

  const results = await Promise.all(statuses.map(async (status) => {
    const [row] = await db
      .select({ count: count() })
      .from(inspectionsTable)
      .leftJoin(elevatorsTable, eq(inspectionsTable.elevatorId, elevatorsTable.id))
      .leftJoin(buildingsTable, eq(elevatorsTable.buildingId, buildingsTable.id))
      .where(and(eq(inspectionsTable.organizationId, orgId), eq(inspectionsTable.status, status), buildingCustomerFilter));
    return { status, count: Number(row.count) };
  }));
  res.json(results);
});

router.get("/overdue-by-building", async (req, res) => {
  const orgId = req.user!.organizationId;

  const allowedIds = await getAccessibleCustomerIds(req.user!);
  if (allowedIds !== null && allowedIds.length === 0) { res.json([]); return; }

  const conditions: any[] = [
    eq(inspectionsTable.organizationId, orgId),
    eq(inspectionsTable.status, "OVERDUE"),
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

export default router;
