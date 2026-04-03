import { Router } from "express";
import { db, customersTable, userCustomersTable, usersTable } from "@workspace/db";
import { eq, and, ilike, inArray } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { CreateCustomerBody, ListCustomersQueryParams, GetCustomerParams, UpdateCustomerParams, DeleteCustomerParams } from "@workspace/api-zod";
import { getAccessibleCustomerIds } from "../lib/user-access.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  const params = ListCustomersQueryParams.safeParse(req.query);
  const search = params.success ? params.data.search : undefined;
  const orgId = req.user!.organizationId;

  const allowedIds = await getAccessibleCustomerIds(req.user!);
  if (allowedIds !== null && allowedIds.length === 0) { res.json([]); return; }

  const conditions: any[] = [eq(customersTable.organizationId, orgId)];
  if (search) conditions.push(ilike(customersTable.name, `%${search}%`));
  if (allowedIds !== null) conditions.push(inArray(customersTable.id, allowedIds));

  const customers = await db.select().from(customersTable).where(and(...conditions)).orderBy(customersTable.name);
  res.json(customers.map(c => ({
    id: c.id,
    name: c.name,
    organizationId: c.organizationId,
    createdAt: c.createdAt.toISOString(),
  })));
});

router.post("/", requireAdmin, async (req, res) => {
  const parsed = CreateCustomerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const orgId = req.user!.organizationId;
  const inserted = await db.insert(customersTable).values({
    name: parsed.data.name,
    organizationId: orgId,
  }).returning();
  const c = inserted[0];
  res.status(201).json({
    id: c.id,
    name: c.name,
    organizationId: c.organizationId,
    createdAt: c.createdAt.toISOString(),
  });
});

router.get("/:id", async (req, res) => {
  const params = GetCustomerParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const orgId = req.user!.organizationId;
  const customers = await db.select().from(customersTable)
    .where(and(eq(customersTable.id, params.data.id), eq(customersTable.organizationId, orgId)))
    .limit(1);
  if (!customers[0]) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const c = customers[0];
  res.json({ id: c.id, name: c.name, organizationId: c.organizationId, createdAt: c.createdAt.toISOString() });
});

router.get("/:id/users", async (req, res) => {
  const params = GetCustomerParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const orgId = req.user!.organizationId;

  const customer = await db.select().from(customersTable)
    .where(and(eq(customersTable.id, params.data.id), eq(customersTable.organizationId, orgId)))
    .limit(1);
  if (!customer[0]) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }

  const allCustomerUsers = await db.select({ id: usersTable.id })
    .from(usersTable)
    .where(and(eq(usersTable.organizationId, orgId), eq(usersTable.allCustomers, true)));

  const assignedUsers = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      role: usersTable.role,
      isActive: usersTable.isActive,
    })
    .from(userCustomersTable)
    .innerJoin(usersTable, eq(userCustomersTable.userId, usersTable.id))
    .where(and(eq(userCustomersTable.customerId, params.data.id), eq(userCustomersTable.organizationId, orgId)));

  const globalUsers = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      role: usersTable.role,
      isActive: usersTable.isActive,
    })
    .from(usersTable)
    .where(and(eq(usersTable.organizationId, orgId), eq(usersTable.allCustomers, true)));

  const seenIds = new Set<number>();
  const combined = [...assignedUsers, ...globalUsers].filter(u => {
    if (seenIds.has(u.id)) return false;
    seenIds.add(u.id);
    return true;
  });

  res.json(combined);
});

router.put("/:id", requireAdmin, async (req, res) => {
  const params = UpdateCustomerParams.safeParse({ id: Number(req.params.id) });
  const body = CreateCustomerBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const orgId = req.user!.organizationId;
  const updated = await db.update(customersTable)
    .set({ name: body.data.name })
    .where(and(eq(customersTable.id, params.data.id), eq(customersTable.organizationId, orgId)))
    .returning();
  if (!updated[0]) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const c = updated[0];
  res.json({ id: c.id, name: c.name, organizationId: c.organizationId, createdAt: c.createdAt.toISOString() });
});

router.delete("/:id", requireAdmin, async (req, res) => {
  const params = DeleteCustomerParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const orgId = req.user!.organizationId;
  await db.delete(customersTable)
    .where(and(eq(customersTable.id, params.data.id), eq(customersTable.organizationId, orgId)));
  res.status(204).send();
});

export default router;
