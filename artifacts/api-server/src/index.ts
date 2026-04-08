import app from "./app.js";
import { logger } from "./lib/logger.js";
import { db, organizationsTable, usersTable } from "@workspace/db";
import { count, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { runMigrations } from "stripe-replit-sync";
import { getStripeSync } from "./stripeClient.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function bootstrapIfEmpty() {
  try {
    const [{ value }] = await db.select({ value: count() }).from(organizationsTable);
    if (value > 0) {
      logger.info("Database already seeded, skipping bootstrap");
      return;
    }

    const orgName       = process.env.BOOTSTRAP_ORG_NAME      ?? "Acme Elevator Services";
    const adminEmail    = process.env.BOOTSTRAP_ADMIN_EMAIL    ?? "admin@acme.com";
    const adminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;
    const userEmail     = process.env.BOOTSTRAP_USER_EMAIL     ?? "inspector@acme.com";
    const userPassword  = process.env.BOOTSTRAP_USER_PASSWORD;

    if (!adminPassword) {
      logger.error("BOOTSTRAP_ADMIN_PASSWORD environment variable is required for first-time setup. Aborting bootstrap.");
      return;
    }
    if (!userPassword) {
      logger.error("BOOTSTRAP_USER_PASSWORD environment variable is required for first-time setup. Aborting bootstrap.");
      return;
    }

    logger.info("Database is empty — running bootstrap seed...");

    const [org] = await db
      .insert(organizationsTable)
      .values({ name: orgName })
      .returning();

    const adminHash = await bcrypt.hash(adminPassword, 10);
    await db.insert(usersTable).values({
      email: adminEmail,
      passwordHash: adminHash,
      role: "ADMIN",
      organizationId: org.id,
      isActive: true,
    });

    const userHash = await bcrypt.hash(userPassword, 10);
    await db.insert(usersTable).values({
      email: userEmail,
      passwordHash: userHash,
      role: "USER",
      organizationId: org.id,
      isActive: true,
    });

    logger.info({ adminEmail }, "Bootstrap complete — admin user created");
  } catch (err) {
    logger.error({ err }, "Bootstrap failed");
  }
}

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    logger.warn("DATABASE_URL not set, skipping Stripe init");
    return;
  }
  try {
    logger.info("Initializing Stripe schema...");
    await runMigrations({ databaseUrl });
    logger.info("Stripe schema ready");
  } catch (err) {
    logger.warn({ err }, "Stripe schema migration skipped");
  }
  try {
    const stripeSync = await getStripeSync();
    const webhookBaseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;
    await stripeSync.findOrCreateManagedWebhook(`${webhookBaseUrl}/api/stripe/webhook`);
    logger.info("Stripe webhook configured");
    stripeSync.syncBackfill()
      .then(() => logger.info("Stripe backfill complete"))
      .catch((err: any) => logger.warn({ err }, "Stripe backfill warning"));
  } catch (err) {
    logger.warn({ err }, "Stripe webhook/sync setup skipped — billing checkout still works");
  }
}

await bootstrapIfEmpty();

// Start the server first so the health check can pass regardless of Stripe init status.
// Stripe init runs in the background — failures are non-fatal.
app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});

initStripe().catch((err) =>
  logger.warn({ err }, "Stripe init failed — billing features may be unavailable")
);
