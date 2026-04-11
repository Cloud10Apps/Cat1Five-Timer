import { Router } from "express";
import { db, organizationsTable } from "@workspace/db";
import { eq, count, and } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { getUncachableStripeClient, getStripePublishableKey } from "../stripeClient.js";
import { stripeStorage } from "../stripeStorage.js";
import { usersTable } from "@workspace/db";
import { asyncHandler } from "../lib/asyncHandler.js";

const router = Router();

router.use(requireAuth);

router.get("/publishable-key", asyncHandler(async (_req, res) => {
  const key = await getStripePublishableKey();
  res.json({ publishableKey: key });
}));

router.get("/status", asyncHandler(async (req, res) => {
  const orgId = req.user!.organizationId;
  const [org] = await db.select().from(organizationsTable).where(eq(organizationsTable.id, orgId));

  const [{ value: userCount }] = await db.select({ value: count() }).from(usersTable).where(and(eq(usersTable.organizationId, orgId), eq(usersTable.isActive, true)));

  if (!org.stripeSubscriptionId) {
    res.json({ status: "inactive", subscription: null, userCount });
    return;
  }

  const subscription = await stripeStorage.getSubscription(org.stripeSubscriptionId);

  res.json({
    status: subscription?.status ?? "inactive",
    subscription: subscription ? {
      id: subscription.id,
      status: subscription.status,
      currentPeriodEnd: (subscription as any).current_period_end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      quantity: (subscription as any).quantity,
      unitAmount: subscription.items?.data?.[0]?.price?.unit_amount ?? null,
    } : null,
    userCount,
  });
}));

router.get("/plans", asyncHandler(async (_req, res) => {
  const rows = await stripeStorage.getProductsWithPrices();
  res.json({ plans: rows });
}));

router.post("/checkout", requireAdmin, asyncHandler(async (req, res) => {
  const orgId = req.user!.organizationId;
  const { priceId } = req.body as { priceId: string };
  if (!priceId) {
    res.status(400).json({ error: "priceId required" });
    return;
  }

  const [org] = await db.select().from(organizationsTable).where(eq(organizationsTable.id, orgId));
  const [{ value: userCount }] = await db.select({ value: count() }).from(usersTable).where(and(eq(usersTable.organizationId, orgId), eq(usersTable.isActive, true)));

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
}));

router.post("/portal", requireAdmin, asyncHandler(async (req, res) => {
  const orgId = req.user!.organizationId;
  const [org] = await db.select().from(organizationsTable).where(eq(organizationsTable.id, orgId));

  if (!org.stripeCustomerId) {
    res.status(400).json({ error: "No billing account found. Please subscribe first." });
    return;
  }

  const stripe = await getUncachableStripeClient();
  const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;

  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: `${baseUrl}/billing`,
  });

  res.json({ url: session.url });
}));

router.post("/sync-seats", requireAdmin, asyncHandler(async (req, res) => {
  const orgId = req.user!.organizationId;
  const [org] = await db.select().from(organizationsTable).where(eq(organizationsTable.id, orgId));

  if (!org.stripeSubscriptionId) {
    res.status(400).json({ error: "No active subscription" });
    return;
  }

  const [{ value: userCount }] = await db.select({ value: count() }).from(usersTable).where(and(eq(usersTable.organizationId, orgId), eq(usersTable.isActive, true)));
  const stripe = await getUncachableStripeClient();

  const subscription = await stripe.subscriptions.retrieve(org.stripeSubscriptionId);
  const itemId = subscription.items.data[0]?.id;
  if (!itemId) {
    res.status(400).json({ error: "No subscription item found" });
    return;
  }

  await stripe.subscriptionItems.update(itemId, { quantity: Math.max(userCount, 1) });

  res.json({ ok: true, seats: userCount });
}));

export default router;
