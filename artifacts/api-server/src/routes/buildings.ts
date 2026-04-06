import { Router } from "express";
import { db, buildingsTable, customersTable, elevatorsTable, inspectionsTable } from "@workspace/db";
import { eq, and, ilike, inArray, count, asc } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";
import { CreateBuildingBody, ListBuildingsQueryParams, GetBuildingParams, UpdateBuildingParams, DeleteBuildingParams } from "@workspace/api-zod";
import { getAccessibleCustomerIds } from "../lib/user-access.js";
import { asyncHandler } from "../lib/asyncHandler.js";

const router = Router();

router.use(requireAuth);

router.get("/", asyncHandler(async (req, res) => {
  const params = ListBuildingsQueryParams.safeParse(req.query);
  const orgId = req.user!.organizationId;

  const allowedIds = await getAccessibleCustomerIds(req.user!);
  if (allowedIds !== null && allowedIds.length === 0) { res.json([]); return; }

  const conditions: any[] = [eq(buildingsTable.organizationId, orgId)];
  if (params.success && params.data.customerId) conditions.push(eq(buildingsTable.customerId, params.data.customerId));
  if (params.success && params.data.search) conditions.push(ilike(buildingsTable.name, `%${params.data.search}%`));
  if (allowedIds !== null) conditions.push(inArray(buildingsTable.customerId, allowedIds));

  const elevatorCountSq = db
    .select({ buildingId: elevatorsTable.buildingId, elevCnt: count().as("elev_cnt") })
    .from(elevatorsTable)
    .groupBy(elevatorsTable.buildingId)
    .as("elevator_counts");

  const inspectionCountSq = db
    .select({ buildingId: elevatorsTable.buildingId, inspCnt: count().as("insp_cnt") })
    .from(inspectionsTable)
    .innerJoin(elevatorsTable, eq(inspectionsTable.elevatorId, elevatorsTable.id))
    .groupBy(elevatorsTable.buildingId)
    .as("inspection_counts");

  const buildings = await db
    .select({
      id: buildingsTable.id,
      name: buildingsTable.name,
      address: buildingsTable.address,
      city: buildingsTable.city,
      state: buildingsTable.state,
      zip: buildingsTable.zip,
      customerId: buildingsTable.customerId,
      customerName: customersTable.name,
      organizationId: buildingsTable.organizationId,
      createdAt: buildingsTable.createdAt,
      elevatorCount: elevatorCountSq.elevCnt,
      inspectionCount: inspectionCountSq.inspCnt,
    })
    .from(buildingsTable)
    .leftJoin(customersTable, eq(buildingsTable.customerId, customersTable.id))
    .leftJoin(elevatorCountSq, eq(buildingsTable.id, elevatorCountSq.buildingId))
    .leftJoin(inspectionCountSq, eq(buildingsTable.id, inspectionCountSq.buildingId))
    .where(and(...conditions))
    .orderBy(asc(customersTable.name), asc(buildingsTable.city), asc(buildingsTable.state), asc(buildingsTable.name));

  res.json(buildings.map(b => ({
    id: b.id,
    name: b.name,
    address: b.address ?? undefined,
    city: b.city ?? undefined,
    state: b.state ?? undefined,
    zip: b.zip ?? undefined,
    customerId: b.customerId,
    customerName: b.customerName ?? undefined,
    organizationId: b.organizationId,
    createdAt: b.createdAt.toISOString(),
    elevatorCount: Number(b.elevatorCount ?? 0),
    inspectionCount: Number(b.inspectionCount ?? 0),
  })));
}));

router.post("/", asyncHandler(async (req, res) => {
  const parsed = CreateBuildingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const orgId = req.user!.organizationId;
  const inserted = await db.insert(buildingsTable).values({
    name: parsed.data.name,
    address: parsed.data.address,
    city: parsed.data.city,
    state: parsed.data.state,
    zip: parsed.data.zip,
    customerId: parsed.data.customerId,
    organizationId: orgId,
  }).returning();
  const b = inserted[0];
  const customers = await db.select().from(customersTable).where(eq(customersTable.id, b.customerId)).limit(1);
  res.status(201).json({
    id: b.id,
    name: b.name,
    address: b.address ?? undefined,
    city: b.city ?? undefined,
    state: b.state ?? undefined,
    zip: b.zip ?? undefined,
    customerId: b.customerId,
    customerName: customers[0]?.name,
    organizationId: b.organizationId,
    createdAt: b.createdAt.toISOString(),
  });
}));

router.get("/:id", asyncHandler(async (req, res) => {
  const params = GetBuildingParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const orgId = req.user!.organizationId;
  const buildings = await db
    .select({
      id: buildingsTable.id,
      name: buildingsTable.name,
      address: buildingsTable.address,
      city: buildingsTable.city,
      state: buildingsTable.state,
      zip: buildingsTable.zip,
      customerId: buildingsTable.customerId,
      customerName: customersTable.name,
      organizationId: buildingsTable.organizationId,
      createdAt: buildingsTable.createdAt,
    })
    .from(buildingsTable)
    .leftJoin(customersTable, eq(buildingsTable.customerId, customersTable.id))
    .where(and(eq(buildingsTable.id, params.data.id), eq(buildingsTable.organizationId, orgId)))
    .limit(1);
  if (!buildings[0]) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const b = buildings[0];
  res.json({ id: b.id, name: b.name, address: b.address ?? undefined, city: b.city ?? undefined, state: b.state ?? undefined, zip: b.zip ?? undefined, customerId: b.customerId, customerName: b.customerName ?? undefined, organizationId: b.organizationId, createdAt: b.createdAt.toISOString() });
}));

router.put("/:id", asyncHandler(async (req, res) => {
  const params = UpdateBuildingParams.safeParse({ id: Number(req.params.id) });
  const body = CreateBuildingBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const orgId = req.user!.organizationId;
  const updated = await db.update(buildingsTable)
    .set({ name: body.data.name, address: body.data.address, city: body.data.city, state: body.data.state, zip: body.data.zip, customerId: body.data.customerId })
    .where(and(eq(buildingsTable.id, params.data.id), eq(buildingsTable.organizationId, orgId)))
    .returning();
  if (!updated[0]) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const b = updated[0];
  const customers = await db.select().from(customersTable).where(eq(customersTable.id, b.customerId)).limit(1);
  res.json({ id: b.id, name: b.name, address: b.address ?? undefined, city: b.city ?? undefined, state: b.state ?? undefined, zip: b.zip ?? undefined, customerId: b.customerId, customerName: customers[0]?.name, organizationId: b.organizationId, createdAt: b.createdAt.toISOString() });
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  const params = DeleteBuildingParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const orgId = req.user!.organizationId;
  await db.delete(buildingsTable).where(and(eq(buildingsTable.id, params.data.id), eq(buildingsTable.organizationId, orgId)));
  res.status(204).send();
}));

export default router;
