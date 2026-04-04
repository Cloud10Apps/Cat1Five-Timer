import app from "./app";
import { logger } from "./lib/logger";
import { db, organizationsTable, usersTable } from "@workspace/db";
import { count } from "drizzle-orm";
import bcrypt from "bcryptjs";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
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

    logger.info("Database is empty — running bootstrap seed...");

    const [org] = await db
      .insert(organizationsTable)
      .values({ name: "Acme Elevator Services" })
      .returning();

    const adminHash = await bcrypt.hash("admin123", 10);
    await db.insert(usersTable).values({
      email: "admin@acme.com",
      passwordHash: adminHash,
      role: "ADMIN",
      organizationId: org.id,
      isActive: true,
    });

    const userHash = await bcrypt.hash("user123", 10);
    await db.insert(usersTable).values({
      email: "inspector@acme.com",
      passwordHash: userHash,
      role: "USER",
      organizationId: org.id,
      isActive: true,
    });

    logger.info("Bootstrap complete — admin@acme.com / admin123 created");
  } catch (err) {
    logger.error({ err }, "Bootstrap failed");
  }
}

bootstrapIfEmpty().then(() => {
  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
});
