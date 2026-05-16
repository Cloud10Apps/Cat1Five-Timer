import { Router } from "express";
import {
  db,
  contactsTable,
  customersTable,
  contactCustomersTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";
import { AddContactCustomerBody } from "@workspace/api-zod";
import { asyncHandler } from "../lib/asyncHandler.js";

const router = Router({ mergeParams: true });

router.use(requireAuth);

function parseId(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

router.post("/", asyncHandler(async (req, res) => {
  const contactId = parseId(req.params.contactId);
  if (contactId === null) { res.status(400).json({ error: "Invalid contactId" }); return; }
  const parsed = AddContactCustomerBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid request body" }); return; }
  const orgId = req.user!.organizationId;

  const [contact] = await db
    .select({ id: contactsTable.id })
    .from(contactsTable)
    .where(and(eq(contactsTable.id, contactId), eq(contactsTable.organizationId, orgId)))
    .limit(1);
  if (!contact) { res.status(404).json({ error: "Contact not found" }); return; }

  const [customer] = await db
    .select({ id: customersTable.id })
    .from(customersTable)
    .where(and(eq(customersTable.id, parsed.data.customerId), eq(customersTable.organizationId, orgId)))
    .limit(1);
  if (!customer) { res.status(404).json({ error: "Customer not found" }); return; }

  try {
    await db.insert(contactCustomersTable).values({
      contactId,
      customerId: parsed.data.customerId,
    });
  } catch (err: any) {
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "23505") {
      res.status(409).json({ error: "Association already exists" });
      return;
    }
    throw err;
  }

  res.status(204).send();
}));

router.delete("/:customerId", asyncHandler(async (req, res) => {
  const contactId = parseId(req.params.contactId);
  const customerId = parseId(req.params.customerId);
  if (contactId === null || customerId === null) {
    res.status(400).json({ error: "Invalid path parameters" });
    return;
  }
  const orgId = req.user!.organizationId;

  const [contact] = await db
    .select({ id: contactsTable.id })
    .from(contactsTable)
    .where(and(eq(contactsTable.id, contactId), eq(contactsTable.organizationId, orgId)))
    .limit(1);
  if (!contact) { res.status(404).json({ error: "Contact not found" }); return; }

  const deleted = await db
    .delete(contactCustomersTable)
    .where(and(
      eq(contactCustomersTable.contactId, contactId),
      eq(contactCustomersTable.customerId, customerId),
    ))
    .returning();

  if (deleted.length === 0) {
    res.status(404).json({ error: "Association not found" });
    return;
  }
  res.status(204).send();
}));

export default router;
