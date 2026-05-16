import { Router } from "express";
import {
  db,
  contactsTable,
  customersTable,
  buildingContactsTable,
  buildingsTable,
} from "@workspace/db";
import { eq, and, ilike, inArray, or, count, asc } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";
import {
  CreateContactBody,
  ListContactsQueryParams,
  GetContactParams,
  UpdateContactParams,
  DeleteContactParams,
} from "@workspace/api-zod";
import { getAccessibleCustomerIds } from "../lib/user-access.js";
import { asyncHandler } from "../lib/asyncHandler.js";

const router = Router();

router.use(requireAuth);

const BUILDING_PREVIEW_COUNT = 1;

type ContactRow = typeof contactsTable.$inferSelect & { customerName: string | null };

async function serializeContacts(rows: ContactRow[]) {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);

  const counts = await db
    .select({ contactId: buildingContactsTable.contactId, cnt: count().as("cnt") })
    .from(buildingContactsTable)
    .where(inArray(buildingContactsTable.contactId, ids))
    .groupBy(buildingContactsTable.contactId);
  const countMap = new Map(counts.map((c) => [c.contactId, Number(c.cnt)]));

  const assignments = await db
    .select({
      contactId: buildingContactsTable.contactId,
      buildingName: buildingsTable.name,
    })
    .from(buildingContactsTable)
    .innerJoin(buildingsTable, eq(buildingContactsTable.buildingId, buildingsTable.id))
    .where(inArray(buildingContactsTable.contactId, ids))
    .orderBy(asc(buildingsTable.name));
  const previewMap = new Map<number, string[]>();
  for (const a of assignments) {
    const list = previewMap.get(a.contactId) ?? [];
    if (list.length < BUILDING_PREVIEW_COUNT) list.push(a.buildingName);
    previewMap.set(a.contactId, list);
  }

  return rows.map((r) => ({
    id: r.id,
    customerId: r.customerId,
    customerName: r.customerName ?? undefined,
    organizationId: r.organizationId,
    contactType: r.contactType,
    companyName: r.companyName ?? undefined,
    contactName: r.contactName ?? undefined,
    email: r.email,
    phone: r.phone ?? undefined,
    buildingCount: countMap.get(r.id) ?? 0,
    buildingNamesPreview: previewMap.get(r.id) ?? [],
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

router.get("/", asyncHandler(async (req, res) => {
  const params = ListContactsQueryParams.safeParse(req.query);
  const orgId = req.user!.organizationId;

  const allowedIds = await getAccessibleCustomerIds(req.user!);
  if (allowedIds !== null && allowedIds.length === 0) { res.json([]); return; }

  const conditions: any[] = [eq(contactsTable.organizationId, orgId)];
  if (params.success && params.data.customerId) {
    conditions.push(eq(contactsTable.customerId, params.data.customerId));
  }
  if (params.success && params.data.contactType) {
    conditions.push(eq(contactsTable.contactType, params.data.contactType));
  }
  if (params.success && params.data.search) {
    const term = `%${params.data.search}%`;
    conditions.push(
      or(
        ilike(contactsTable.companyName, term),
        ilike(contactsTable.contactName, term),
        ilike(contactsTable.email, term),
      ),
    );
  }
  if (allowedIds !== null) {
    conditions.push(inArray(contactsTable.customerId, allowedIds));
  }

  const rows = await db
    .select({
      id: contactsTable.id,
      customerId: contactsTable.customerId,
      organizationId: contactsTable.organizationId,
      contactType: contactsTable.contactType,
      companyName: contactsTable.companyName,
      contactName: contactsTable.contactName,
      email: contactsTable.email,
      phone: contactsTable.phone,
      createdAt: contactsTable.createdAt,
      updatedAt: contactsTable.updatedAt,
      customerName: customersTable.name,
    })
    .from(contactsTable)
    .leftJoin(customersTable, eq(contactsTable.customerId, customersTable.id))
    .where(and(...conditions))
    .orderBy(asc(contactsTable.contactType), asc(contactsTable.companyName), asc(contactsTable.contactName));

  res.json(await serializeContacts(rows as ContactRow[]));
}));

router.post("/", asyncHandler(async (req, res) => {
  const parsed = CreateContactBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  if (!parsed.data.companyName && !parsed.data.contactName) {
    res.status(400).json({ error: "Either companyName or contactName is required" });
    return;
  }
  const orgId = req.user!.organizationId;

  const customer = await db
    .select({ id: customersTable.id })
    .from(customersTable)
    .where(and(eq(customersTable.id, parsed.data.customerId), eq(customersTable.organizationId, orgId)))
    .limit(1);
  if (!customer[0]) {
    res.status(400).json({ error: "Customer not found" });
    return;
  }

  const inserted = await db.insert(contactsTable).values({
    customerId: parsed.data.customerId,
    organizationId: orgId,
    contactType: parsed.data.contactType,
    companyName: parsed.data.companyName,
    contactName: parsed.data.contactName,
    email: parsed.data.email,
    phone: parsed.data.phone,
  }).returning();

  const c = inserted[0];
  const customerRow = await db.select().from(customersTable).where(eq(customersTable.id, c.customerId)).limit(1);
  const serialized = await serializeContacts([{ ...c, customerName: customerRow[0]?.name ?? null }]);
  res.status(201).json(serialized[0]);
}));

router.get("/:id", asyncHandler(async (req, res) => {
  const params = GetContactParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const orgId = req.user!.organizationId;
  const rows = await db
    .select({
      id: contactsTable.id,
      customerId: contactsTable.customerId,
      organizationId: contactsTable.organizationId,
      contactType: contactsTable.contactType,
      companyName: contactsTable.companyName,
      contactName: contactsTable.contactName,
      email: contactsTable.email,
      phone: contactsTable.phone,
      createdAt: contactsTable.createdAt,
      updatedAt: contactsTable.updatedAt,
      customerName: customersTable.name,
    })
    .from(contactsTable)
    .leftJoin(customersTable, eq(contactsTable.customerId, customersTable.id))
    .where(and(eq(contactsTable.id, params.data.id), eq(contactsTable.organizationId, orgId)))
    .limit(1);
  if (!rows[0]) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const serialized = await serializeContacts(rows as ContactRow[]);
  res.json(serialized[0]);
}));

router.put("/:id", asyncHandler(async (req, res) => {
  const params = UpdateContactParams.safeParse({ id: Number(req.params.id) });
  const body = CreateContactBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  if (!body.data.companyName && !body.data.contactName) {
    res.status(400).json({ error: "Either companyName or contactName is required" });
    return;
  }
  const orgId = req.user!.organizationId;

  const customer = await db
    .select({ id: customersTable.id })
    .from(customersTable)
    .where(and(eq(customersTable.id, body.data.customerId), eq(customersTable.organizationId, orgId)))
    .limit(1);
  if (!customer[0]) {
    res.status(400).json({ error: "Customer not found" });
    return;
  }

  const updated = await db
    .update(contactsTable)
    .set({
      customerId: body.data.customerId,
      contactType: body.data.contactType,
      companyName: body.data.companyName,
      contactName: body.data.contactName,
      email: body.data.email,
      phone: body.data.phone,
      updatedAt: new Date(),
    })
    .where(and(eq(contactsTable.id, params.data.id), eq(contactsTable.organizationId, orgId)))
    .returning();

  if (!updated[0]) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const c = updated[0];
  const customerRow = await db.select().from(customersTable).where(eq(customersTable.id, c.customerId)).limit(1);
  const serialized = await serializeContacts([{ ...c, customerName: customerRow[0]?.name ?? null }]);
  res.json(serialized[0]);
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  const params = DeleteContactParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const orgId = req.user!.organizationId;
  await db.delete(contactsTable)
    .where(and(eq(contactsTable.id, params.data.id), eq(contactsTable.organizationId, orgId)));
  res.status(204).send();
}));

export default router;
