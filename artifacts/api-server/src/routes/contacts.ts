import { Router } from "express";
import {
  db,
  contactsTable,
  customersTable,
  buildingContactsTable,
  buildingsTable,
  elevatorsTable,
  contactCustomersTable,
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
import { writeContactCustomers } from "../lib/contact-customers.js";

const router = Router();

router.use(requireAuth);

const BUILDING_PREVIEW_COUNT = 1;

type ContactRow = typeof contactsTable.$inferSelect;

async function serializeContacts(rows: ContactRow[]) {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);

  const customerRows = await db
    .select({
      contactId: contactCustomersTable.contactId,
      id: customersTable.id,
      name: customersTable.name,
    })
    .from(contactCustomersTable)
    .innerJoin(customersTable, eq(contactCustomersTable.customerId, customersTable.id))
    .where(inArray(contactCustomersTable.contactId, ids))
    .orderBy(asc(customersTable.name));
  const customersMap = new Map<number, { id: number; name: string }[]>();
  for (const r of customerRows) {
    const arr = customersMap.get(r.contactId) ?? [];
    arr.push({ id: r.id, name: r.name });
    customersMap.set(r.contactId, arr);
  }

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
    customers: customersMap.get(r.id) ?? [],
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

async function loadOrgContactById(id: number, orgId: number): Promise<ContactRow | null> {
  const rows = await db
    .select()
    .from(contactsTable)
    .where(and(eq(contactsTable.id, id), eq(contactsTable.organizationId, orgId)))
    .limit(1);
  return rows[0] ?? null;
}

async function validateCustomerIdsForOrg(ids: number[], orgId: number): Promise<boolean> {
  if (ids.length === 0) return false;
  const found = await db
    .select({ id: customersTable.id })
    .from(customersTable)
    .where(and(inArray(customersTable.id, ids), eq(customersTable.organizationId, orgId)));
  return found.length === ids.length;
}

router.get("/", asyncHandler(async (req, res) => {
  const params = ListContactsQueryParams.safeParse(req.query);
  const orgId = req.user!.organizationId;

  const allowedIds = await getAccessibleCustomerIds(req.user!);
  if (allowedIds !== null && allowedIds.length === 0) { res.json([]); return; }

  // Resolve unitId -> buildingId if provided
  let effectiveBuildingId: number | undefined = params.success ? params.data.buildingId : undefined;
  if (params.success && params.data.unitId) {
    const unit = await db
      .select({ buildingId: elevatorsTable.buildingId })
      .from(elevatorsTable)
      .where(and(eq(elevatorsTable.id, params.data.unitId), eq(elevatorsTable.organizationId, orgId)))
      .limit(1);
    if (!unit[0]) { res.json([]); return; }
    if (effectiveBuildingId && effectiveBuildingId !== unit[0].buildingId) {
      // unit's parent building doesn't match the explicit buildingId filter
      res.json([]);
      return;
    }
    effectiveBuildingId = unit[0].buildingId;
  }

  const conditions: any[] = [eq(contactsTable.organizationId, orgId)];

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

  // Customer filter via contact_customers join
  let contactIdSubset: number[] | null = null;

  const customerScopeIds: number[] = [];
  if (params.success && params.data.customerId) customerScopeIds.push(params.data.customerId);
  if (allowedIds !== null) customerScopeIds.push(...allowedIds);

  if (customerScopeIds.length > 0) {
    const filter = params.success && params.data.customerId
      ? eq(contactCustomersTable.customerId, params.data.customerId)
      : inArray(contactCustomersTable.customerId, allowedIds!);
    const rows = await db
      .selectDistinct({ contactId: contactCustomersTable.contactId })
      .from(contactCustomersTable)
      .where(filter);
    contactIdSubset = rows.map((r) => r.contactId);
    if (contactIdSubset.length === 0) { res.json([]); return; }
  }

  if (effectiveBuildingId) {
    const rows = await db
      .select({ contactId: buildingContactsTable.contactId })
      .from(buildingContactsTable)
      .where(eq(buildingContactsTable.buildingId, effectiveBuildingId));
    const buildingContactIds = rows.map((r) => r.contactId);
    if (buildingContactIds.length === 0) { res.json([]); return; }
    contactIdSubset = contactIdSubset === null
      ? buildingContactIds
      : contactIdSubset.filter((id) => buildingContactIds.includes(id));
    if (contactIdSubset.length === 0) { res.json([]); return; }
  }

  if (contactIdSubset !== null) {
    conditions.push(inArray(contactsTable.id, contactIdSubset));
  }

  const rows = await db
    .select()
    .from(contactsTable)
    .where(and(...conditions))
    .orderBy(asc(contactsTable.contactType), asc(contactsTable.companyName), asc(contactsTable.contactName));

  res.json(await serializeContacts(rows));
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
  const customerIds = Array.from(new Set(parsed.data.customerIds));
  if (customerIds.length === 0) {
    res.status(400).json({ error: "At least one customer is required" });
    return;
  }

  const ok = await validateCustomerIdsForOrg(customerIds, orgId);
  if (!ok) {
    res.status(400).json({ error: "One or more customers not found in your organization" });
    return;
  }

  const inserted = await db.transaction(async (tx) => {
    const ins = await tx.insert(contactsTable).values({
      // customer_id is NOT NULL in step 1; must provide on insert. Helper keeps
      // it in sync afterward. Session 5.7 removes this line when the column drops.
      customerId: customerIds[0],
      organizationId: orgId,
      contactType: parsed.data.contactType,
      companyName: parsed.data.companyName,
      contactName: parsed.data.contactName,
      email: parsed.data.email,
      phone: parsed.data.phone,
    }).returning();
    await writeContactCustomers(tx, ins[0].id, customerIds, { mode: "replace" });
    return ins[0];
  });

  const serialized = await serializeContacts([inserted]);
  res.status(201).json(serialized[0]);
}));

router.get("/:id", asyncHandler(async (req, res) => {
  const params = GetContactParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const orgId = req.user!.organizationId;
  const c = await loadOrgContactById(params.data.id, orgId);
  if (!c) { res.status(404).json({ error: "Not found" }); return; }
  const serialized = await serializeContacts([c]);
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
  const customerIds = Array.from(new Set(body.data.customerIds));
  if (customerIds.length === 0) {
    res.status(400).json({ error: "At least one customer is required" });
    return;
  }

  const ok = await validateCustomerIdsForOrg(customerIds, orgId);
  if (!ok) {
    res.status(400).json({ error: "One or more customers not found in your organization" });
    return;
  }

  const existing = await loadOrgContactById(params.data.id, orgId);
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }

  const updated = await db.transaction(async (tx) => {
    const upd = await tx
      .update(contactsTable)
      .set({
        contactType: body.data.contactType,
        companyName: body.data.companyName,
        contactName: body.data.contactName,
        email: body.data.email,
        phone: body.data.phone,
        updatedAt: new Date(),
      })
      .where(and(eq(contactsTable.id, params.data.id), eq(contactsTable.organizationId, orgId)))
      .returning();
    await writeContactCustomers(tx, params.data.id, customerIds, { mode: "replace" });
    return upd[0];
  });

  const serialized = await serializeContacts([updated]);
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
