import { db, usersTable, userCustomersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { AuthUser } from "../middleware/auth.js";

/**
 * Returns the list of customer IDs a user is allowed to access.
 * - Returns `null`  → no restriction (ADMIN or allCustomers=true USER)
 * - Returns `[]`    → user has no customers assigned (sees nothing)
 * - Returns `[...]` → user may only access these customer IDs
 */
export async function getAccessibleCustomerIds(user: AuthUser): Promise<number[] | null> {
  if (user.role === "ADMIN") return null;

  const [record] = await db
    .select({ allCustomers: usersTable.allCustomers })
    .from(usersTable)
    .where(eq(usersTable.id, user.id))
    .limit(1);

  if (!record || record.allCustomers) return null;

  const rows = await db
    .select({ customerId: userCustomersTable.customerId })
    .from(userCustomersTable)
    .where(eq(userCustomersTable.userId, user.id));

  return rows.map((r) => r.customerId);
}
