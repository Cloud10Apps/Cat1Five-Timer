import { db, usersTable, organizationsTable } from "@workspace/db";
import { eq, count, and } from "drizzle-orm";
import { getUncachableStripeClient } from "./stripeClient.js";

export async function syncSeatsToStripe(orgId: number): Promise<void> {
  const [org] = await db.select().from(organizationsTable).where(eq(organizationsTable.id, orgId));
  if (!org?.stripeSubscriptionId) return;

  const [{ value: activeCount }] = await db
    .select({ value: count() })
    .from(usersTable)
    .where(and(eq(usersTable.organizationId, orgId), eq(usersTable.isActive, true)));

  const seats = Math.max(Number(activeCount), 1);

  try {
    const stripe = await getUncachableStripeClient();
    const subscription = await stripe.subscriptions.retrieve(org.stripeSubscriptionId);
    const itemId = subscription.items.data[0]?.id;
    if (!itemId) return;
    await stripe.subscriptionItems.update(itemId, { quantity: seats });
    console.log(`[syncSeats] org=${orgId} seats=${seats}`);
  } catch (err) {
    console.error(`[syncSeats] Failed to sync seats for org=${orgId}:`, err);
  }
}
