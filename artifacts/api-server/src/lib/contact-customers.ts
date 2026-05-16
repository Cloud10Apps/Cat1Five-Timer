import { contactsTable, contactCustomersTable, db } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface WriteContactCustomersOptions {
  /**
   * "replace": treat customerIds as the COMPLETE desired set; remove any
   *            existing associations not in the list. Also keeps the legacy
   *            contacts.customer_id column in sync with customerIds[0].
   * "add":     only insert missing associations; do not remove any existing,
   *            and do not touch the legacy customer_id column.
   */
  mode: "replace" | "add";
}

/**
 * Single source of truth for writing contact↔customer associations.
 * All three endpoints that change associations call this helper inside a tx:
 *   - POST /api/contacts            (mode: "replace")
 *   - PUT  /api/contacts/:id        (mode: "replace")
 *   - POST /api/buildings/:bid/contacts auto-link (mode: "add")
 *
 * SESSION 5.7 CLEANUP — when contacts.customer_id is dropped, delete the
 * single DUAL-WRITE block below. (Also remove the explicit `customerId:` on
 * the POST /api/contacts INSERT — TypeScript will flag it as the column
 * disappears from the Drizzle schema.) All other logic in this function
 * remains correct.
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
    await tx.insert(contactCustomersTable).values(
      toAdd.map((cid) => ({ contactId, customerId: cid })),
    );
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

    // --- DUAL-WRITE: Session 5.7 deletes this block ---
    if (desiredCustomerIds.length > 0) {
      await tx
        .update(contactsTable)
        .set({ customerId: desiredCustomerIds[0] })
        .where(eq(contactsTable.id, contactId));
    }
    // --- end dual-write ---
  }
}
