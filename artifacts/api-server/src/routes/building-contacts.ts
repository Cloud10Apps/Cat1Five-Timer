import { Router } from "express";
import {
  db,
  buildingsTable,
  contactsTable,
  buildingContactsTable,
} from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";
import {
  AssignBuildingContactBody,
  UpdateBuildingContactBody,
} from "@workspace/api-zod";
import { asyncHandler } from "../lib/asyncHandler.js";

const router = Router({ mergeParams: true });

router.use(requireAuth);

async function loadOrgBuildingId(buildingId: number, orgId: number): Promise<number | null> {
  const rows = await db
    .select({ id: buildingsTable.id })
    .from(buildingsTable)
    .where(and(eq(buildingsTable.id, buildingId), eq(buildingsTable.organizationId, orgId)))
    .limit(1);
  return rows[0]?.id ?? null;
}

function parseId(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function serializeAssignment(
  bc: typeof buildingContactsTable.$inferSelect,
  contact: typeof contactsTable.$inferSelect,
) {
  return {
    id: bc.id,
    buildingId: bc.buildingId,
    contactId: bc.contactId,
    receivesNotifications: bc.receivesNotifications,
    contactType: contact.contactType,
    companyName: contact.companyName ?? undefined,
    contactName: contact.contactName ?? undefined,
    email: contact.email,
    phone: contact.phone ?? undefined,
    createdAt: bc.createdAt.toISOString(),
  };
}

router.get("/", asyncHandler(async (req, res) => {
  const buildingId = parseId(req.params.buildingId);
  if (buildingId === null) { res.status(400).json({ error: "Invalid buildingId" }); return; }
  const orgId = req.user!.organizationId;

  const buildingOk = await loadOrgBuildingId(buildingId, orgId);
  if (!buildingOk) { res.status(404).json({ error: "Building not found" }); return; }

  const rows = await db
    .select({
      bc: buildingContactsTable,
      contact: contactsTable,
    })
    .from(buildingContactsTable)
    .innerJoin(contactsTable, eq(buildingContactsTable.contactId, contactsTable.id))
    .where(and(
      eq(buildingContactsTable.buildingId, buildingId),
      eq(contactsTable.organizationId, orgId),
    ))
    .orderBy(asc(contactsTable.contactType), asc(contactsTable.companyName), asc(contactsTable.contactName));

  res.json(rows.map((r) => serializeAssignment(r.bc, r.contact)));
}));

router.post("/", asyncHandler(async (req, res) => {
  const buildingId = parseId(req.params.buildingId);
  if (buildingId === null) { res.status(400).json({ error: "Invalid buildingId" }); return; }
  const parsed = AssignBuildingContactBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid request body" }); return; }
  const orgId = req.user!.organizationId;

  const buildingOk = await loadOrgBuildingId(buildingId, orgId);
  if (!buildingOk) { res.status(404).json({ error: "Building not found" }); return; }

  const contactRows = await db
    .select()
    .from(contactsTable)
    .where(and(eq(contactsTable.id, parsed.data.contactId), eq(contactsTable.organizationId, orgId)))
    .limit(1);
  if (!contactRows[0]) { res.status(404).json({ error: "Contact not found" }); return; }

  try {
    const inserted = await db.insert(buildingContactsTable).values({
      buildingId,
      contactId: parsed.data.contactId,
      receivesNotifications: parsed.data.receivesNotifications ?? true,
    }).returning();
    res.status(201).json(serializeAssignment(inserted[0], contactRows[0]));
  } catch (err: any) {
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "23505") {
      res.status(409).json({ error: "Contact already assigned to this building" });
      return;
    }
    throw err;
  }
}));

router.put("/:contactId", asyncHandler(async (req, res) => {
  const buildingId = parseId(req.params.buildingId);
  const contactId = Number(req.params.contactId);
  if (buildingId === null || !Number.isInteger(contactId) || contactId <= 0) {
    res.status(400).json({ error: "Invalid path parameters" });
    return;
  }
  const parsed = UpdateBuildingContactBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid request body" }); return; }
  const orgId = req.user!.organizationId;

  const buildingOk = await loadOrgBuildingId(buildingId, orgId);
  if (!buildingOk) { res.status(404).json({ error: "Building not found" }); return; }

  const contactRows = await db
    .select()
    .from(contactsTable)
    .where(and(eq(contactsTable.id, contactId), eq(contactsTable.organizationId, orgId)))
    .limit(1);
  if (!contactRows[0]) { res.status(404).json({ error: "Contact not found" }); return; }

  const updated = await db
    .update(buildingContactsTable)
    .set({ receivesNotifications: parsed.data.receivesNotifications })
    .where(and(
      eq(buildingContactsTable.buildingId, buildingId),
      eq(buildingContactsTable.contactId, contactId),
    ))
    .returning();

  if (!updated[0]) { res.status(404).json({ error: "Assignment not found" }); return; }
  res.json(serializeAssignment(updated[0], contactRows[0]));
}));

router.delete("/:contactId", asyncHandler(async (req, res) => {
  const buildingId = parseId(req.params.buildingId);
  const contactId = Number(req.params.contactId);
  if (buildingId === null || !Number.isInteger(contactId) || contactId <= 0) {
    res.status(400).json({ error: "Invalid path parameters" });
    return;
  }
  const orgId = req.user!.organizationId;

  const buildingOk = await loadOrgBuildingId(buildingId, orgId);
  if (!buildingOk) { res.status(404).json({ error: "Building not found" }); return; }

  await db.delete(buildingContactsTable)
    .where(and(
      eq(buildingContactsTable.buildingId, buildingId),
      eq(buildingContactsTable.contactId, contactId),
    ));
  res.status(204).send();
}));

export default router;
