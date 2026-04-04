import { Router } from "express";
import { db, organizationsTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { getUncachableStripeClient, getStripePublishableKey } from "../stripeClient.js";
import { stripeStorage } from "../stripeStorage.js";
import { usersTable } from "@workspace/db";

const router = Router();

router.use(requireAuth);

router.get("/publishable-key", async (_req, res) => {
  const key = await getStripePublishableKey();
  res.json({ publishableKey: key });
});

router.get("/status", async (req, res) => {
  const orgId = req.user!.organizationId;
  const [org] = await db.select().from(organizationsTable).where(eq(organizationsTable.id, orgId));

  if (!org.stripeSubscriptionId) {
    const [{ value: userCount }] = await db.select({ value: count() }).from(usersTable).where(eq(usersTable.organizationId, orgId));
    return res.json({ status: "inactive", subscription: null, userCount });
  }

  const subscription = await stripeStorage.getSubscription(org.stripeSubscriptionId);
  const [{ value: userCount }] = await db.select({ value: count() }).from(usersTable).where(eq(usersTable.organizationId, orgId));

  res.json({
    status: subscription?.status ?? "inactive",
    subscription: subscription ? {
      id: subscription.id,
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      quantity: subscription.quantity,
    } : null,
    userCount,
  });
});

router.get("/plans", async (_req, res) => {
  const rows = await stripeStorage.getProductsWithPrices();
  res.json({ plans: rows });
});

router.post("/checkout", requireAdmin, async (req, res) => {
  const orgId = req.user!.organizationId;
  const { priceId } = req.body as { priceId: string };
  if (!priceId) return res.status(400).json({ error: "priceId required" });

  const [org] = await db.select().from(organizationsTable).where(eq(organizationsTable.id, orgId));
  const [{ value: userCount }] = await db.select({ value: count() }).from(usersTable).where(eq(usersTable.organizationId, orgId));

  const stripe = await getUncachableStripeClient();

  let customerId = org.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: req.user!.email,
      metadata: { organizationId: String(orgId), organizationName: org.name },
    });
    await db.update(organizationsTable).set({ stripeCustomerId: customer.id }).where(eq(organizationsTable.id, orgId));
    customerId = customer.id;
  }

  const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: Math.max(userCount, 1) }],
    mode: "subscription",
    subscription_data: { trial_period_days: 14 },
    success_url: `${baseUrl}/billing?success=1`,
    cancel_url: `${baseUrl}/billing?canceled=1`,
  });

  res.json({ url: session.url });
});

router.post("/portal", requireAdmin, async (req, res) => {
  const orgId = req.user!.organizationId;
  const [org] = await db.select().from(organizationsTable).where(eq(organizationsTable.id, orgId));

  if (!org.stripeCustomerId) {
    return res.status(400).json({ error: "No billing account found. Please subscribe first." });
  }

  const stripe = await getUncachableStripeClient();
  const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;

  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: `${baseUrl}/billing`,
  });

  res.json({ url: session.url });
});

router.post("/sync-seats", requireAdmin, async (req, res) => {
  const orgId = req.user!.organizationId;
  const [org] = await db.select().from(organizationsTable).where(eq(organizationsTable.id, orgId));

  if (!org.stripeSubscriptionId) {
    return res.status(400).json({ error: "No active subscription" });
  }

  const [{ value: userCount }] = await db.select({ value: count() }).from(usersTable).where(eq(usersTable.organizationId, orgId));
  const stripe = await getUncachableStripeClient();

  const subscription = await stripe.subscriptions.retrieve(org.stripeSubscriptionId);
  const itemId = subscription.items.data[0]?.id;
  if (!itemId) return res.status(400).json({ error: "No subscription item found" });

  await stripe.subscriptionItems.update(itemId, { quantity: Math.max(userCount, 1) });

  res.json({ ok: true, seats: userCount });
});

export default router;
