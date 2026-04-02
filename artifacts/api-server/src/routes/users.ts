import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, userCustomersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { UpdateUserBody, InviteUserBody, UpdateUserParams } from "@workspace/api-zod";

const router = Router();

router.use(requireAuth);

function formatUser(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    allCustomers: u.allCustomers,
    organizationId: u.organizationId,
    createdAt: u.createdAt.toISOString(),
  };
}

router.get("/", requireAdmin, async (req, res) => {
  const orgId = req.user!.organizationId;
  const users = await db.select().from(usersTable).where(eq(usersTable.organizationId, orgId)).orderBy(usersTable.email);
  res.json(users.map(formatUser));
});

router.post("/invite", requireAdmin, async (req, res) => {
  const parsed = InviteUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const orgId = req.user!.organizationId;
  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const inserted = await db.insert(usersTable).values({
    email: parsed.data.email,
    passwordHash,
    role: parsed.data.role,
    organizationId: orgId,
    isActive: true,
    allCustomers: true,
  }).returning();
  res.status(201).json(formatUser(inserted[0]));
});

router.put("/:id", requireAdmin, async (req, res) => {
  const params = UpdateUserParams.safeParse({ id: Number(req.params.id) });
  const body = UpdateUserBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const orgId = req.user!.organizationId;
  const updates: Partial<typeof usersTable.$inferInsert> = {};
  if (body.data.role !== undefined) updates.role = body.data.role;
  if (body.data.isActive !== undefined) updates.isActive = body.data.isActive;

  const updated = await db.update(usersTable)
    .set(updates)
    .where(and(eq(usersTable.id, params.data.id), eq(usersTable.organizationId, orgId)))
    .returning();
  if (!updated[0]) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(formatUser(updated[0]));
});

router.get("/:id/customers", requireAdmin, async (req, res) => {
  const userId = Number(req.params.id);
  const orgId = req.user!.organizationId;
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [user] = await db.select().from(usersTable).where(and(eq(usersTable.id, userId), eq(usersTable.organizationId, orgId)));
  if (!user) { res.status(404).json({ error: "Not found" }); return; }

  const assignments = await db.select().from(userCustomersTable).where(eq(userCustomersTable.userId, userId));
  res.json({
    allCustomers: user.allCustomers ?? true,
    customerIds: assignments.map(a => a.customerId),
  });
});

router.put("/:id/customers", requireAdmin, async (req, res) => {
  const userId = Number(req.params.id);
  const orgId = req.user!.organizationId;
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { allCustomers, customerIds } = req.body as { allCustomers: boolean; customerIds: number[] };
  if (typeof allCustomers !== "boolean" || !Array.isArray(customerIds)) {
    res.status(400).json({ error: "Invalid body: allCustomers (bool) and customerIds (number[]) required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(and(eq(usersTable.id, userId), eq(usersTable.organizationId, orgId)));
  if (!user) { res.status(404).json({ error: "Not found" }); return; }

  await db.update(usersTable).set({ allCustomers }).where(eq(usersTable.id, userId));
  await db.delete(userCustomersTable).where(eq(userCustomersTable.userId, userId));
  if (!allCustomers && customerIds.length > 0) {
    await db.insert(userCustomersTable).values(customerIds.map(cid => ({ userId, customerId: cid, organizationId: orgId })));
  }

  res.json({ allCustomers, customerIds: allCustomers ? [] : customerIds });
});

export default router;
