import { Router } from "express";
import { db, elevatorsTable, buildingsTable, customersTable } from "@workspace/db";
import { eq, and, ilike } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";
import { CreateElevatorBody, ListElevatorsQueryParams, GetElevatorParams, UpdateElevatorParams, DeleteElevatorParams } from "@workspace/api-zod";

const router = Router();

router.use(requireAuth);

async function fetchElevator(id: number, orgId: number) {
  const rows = await db
    .select({
      id: elevatorsTable.id,
      name: elevatorsTable.name,
      description: elevatorsTable.description,
      bank: elevatorsTable.bank,
      type: elevatorsTable.type,
      buildingId: elevatorsTable.buildingId,
      buildingName: buildingsTable.name,
      customerId: buildingsTable.customerId,
      customerName: customersTable.name,
      organizationId: elevatorsTable.organizationId,
      createdAt: elevatorsTable.createdAt,
    })
    .from(elevatorsTable)
    .leftJoin(buildingsTable, eq(elevatorsTable.buildingId, buildingsTable.id))
    .leftJoin(customersTable, eq(buildingsTable.customerId, customersTable.id))
    .where(and(eq(elevatorsTable.id, id), eq(elevatorsTable.organizationId, orgId)))
    .limit(1);
  return rows[0];
}

function formatElevator(e: Awaited<ReturnType<typeof fetchElevator>>) {
  if (!e) return null;
  return {
    id: e.id,
    name: e.name,
    description: e.description ?? undefined,
    bank: e.bank ?? undefined,
    type: e.type,
    buildingId: e.buildingId,
    buildingName: e.buildingName ?? undefined,
    customerId: e.customerId ?? undefined,
    customerName: e.customerName ?? undefined,
    organizationId: e.organizationId,
    createdAt: e.createdAt.toISOString(),
  };
}

router.get("/", async (req, res) => {
  const params = ListElevatorsQueryParams.safeParse(req.query);
  const orgId = req.user!.organizationId;

  const conditions: any[] = [eq(elevatorsTable.organizationId, orgId)];
  if (params.success) {
    if (params.data.buildingId) conditions.push(eq(elevatorsTable.buildingId, params.data.buildingId));
    if (params.data.type) conditions.push(eq(elevatorsTable.type, params.data.type));
    if (params.data.search) conditions.push(ilike(elevatorsTable.name, `%${params.data.search}%`));
    if (params.data.customerId) conditions.push(eq(buildingsTable.customerId, params.data.customerId));
    if (params.data.bank) conditions.push(eq(elevatorsTable.bank, params.data.bank));
  }

  const rows = await db
    .select({
      id: elevatorsTable.id,
      name: elevatorsTable.name,
      description: elevatorsTable.description,
      bank: elevatorsTable.bank,
      type: elevatorsTable.type,
      buildingId: elevatorsTable.buildingId,
      buildingName: buildingsTable.name,
      customerId: buildingsTable.customerId,
      customerName: customersTable.name,
      organizationId: elevatorsTable.organizationId,
      createdAt: elevatorsTable.createdAt,
    })
    .from(elevatorsTable)
    .leftJoin(buildingsTable, eq(elevatorsTable.buildingId, buildingsTable.id))
    .leftJoin(customersTable, eq(buildingsTable.customerId, customersTable.id))
    .where(and(...conditions))
    .orderBy(elevatorsTable.name);

  res.json(rows.map(formatElevator));
});

router.post("/", async (req, res) => {
  const parsed = CreateElevatorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const orgId = req.user!.organizationId;
  const inserted = await db.insert(elevatorsTable).values({
    name: parsed.data.name,
    description: parsed.data.description,
    bank: parsed.data.bank,
    type: parsed.data.type,
    buildingId: parsed.data.buildingId,
    organizationId: orgId,
  }).returning();
  const e = await fetchElevator(inserted[0].id, orgId);
  res.status(201).json(formatElevator(e));
});

router.get("/:id", async (req, res) => {
  const params = GetElevatorParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const e = await fetchElevator(params.data.id, req.user!.organizationId);
  if (!e) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(formatElevator(e));
});

router.put("/:id", async (req, res) => {
  const params = UpdateElevatorParams.safeParse({ id: Number(req.params.id) });
  const body = CreateElevatorBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const orgId = req.user!.organizationId;
  await db.update(elevatorsTable)
    .set({ name: body.data.name, description: body.data.description, bank: body.data.bank, type: body.data.type, buildingId: body.data.buildingId })
    .where(and(eq(elevatorsTable.id, params.data.id), eq(elevatorsTable.organizationId, orgId)));
  const e = await fetchElevator(params.data.id, orgId);
  if (!e) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(formatElevator(e));
});

router.delete("/:id", async (req, res) => {
  const params = DeleteElevatorParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const orgId = req.user!.organizationId;
  await db.delete(elevatorsTable).where(and(eq(elevatorsTable.id, params.data.id), eq(elevatorsTable.organizationId, orgId)));
  res.status(204).send();
});

export default router;
