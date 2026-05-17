import { contactCustomersTable, db } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface WriteContactCustomersOptions {
  /**
   * "replace": treat customerIds as the COMPLETE desired set; remove any
   *            existing associations not in the list.
   * "add":     only insert missing associations; do not remove any existing.
   */
  mode: "replace" | "add";
}

/**
 * Single source of truth for writing contact↔customer associations.
 * Called inside a tx from:
 *   - POST /api/contacts            (mode: "replace")
 *   - PUT  /api/contacts/:id        (mode: "replace")
 *   - POST /api/buildings/:bid/contacts auto-link (mode: "add")
 */
export async function writeContactCustomers(
  tx: Tx,
  contactId: number,
  desiredCustomerIds: number[],
  options: WriteContactCustomersOptions,
): Promise<void> {
  const current = await tx
    .select({ customerId: contactCustomersTable.customerId })
    .from(contactCustomersTable)
    .where(eq(contactCustomersTable.contactId, contactId));
  const currentSet = new Set(current.map((r) => r.customerId));
  const desiredSet = new Set(desiredCustomerIds);

  const toAdd = desiredCustomerIds.filter((id) => !currentSet.has(id));
  if (toAdd.length > 0) {
    // ON CONFLICT DO NOTHING because parallel POST /buildings/:bid/contacts
    // requests for the same (contact, customer) race on this insert. Without
    // it, the second tx hits the unique constraint, rolls back, and the
    // building_contacts insert is lost too. Idempotent: safe in both add and
    // replace modes since we only ever want each row to exist once.
    await tx
      .insert(contactCustomersTable)
      .values(toAdd.map((cid) => ({ contactId, customerId: cid })))
      .onConflictDoNothing({
        target: [contactCustomersTable.contactId, contactCustomersTable.customerId],
      });
  }

  if (options.mode === "replace") {
    const toRemove = current
      .map((r) => r.customerId)
      .filter((id) => !desiredSet.has(id));
    if (toRemove.length > 0) {
      await tx
        .delete(contactCustomersTable)
        .where(and(
          eq(contactCustomersTable.contactId, contactId),
          inArray(contactCustomersTable.customerId, toRemove),
        ));
    }
  }
}
