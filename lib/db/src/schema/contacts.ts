import { pgTable, text, serial, timestamp, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";
import { customersTable } from "./customers";

export const contactsTable = pgTable("contacts", {
  id: serial("id").primaryKey(),
  // Legacy single-customer column. Kept nullable + FK + cascade as a historical
  // artifact during Session 5.7's expand-contract transition. New code never reads
  // or writes it; contact↔customer is owned exclusively by contact_customers.
  // Physical column removal deferred to a future micro-session.
  customerId: integer("customer_id").references(() => customersTable.id, { onDelete: "cascade" }),
  organizationId: integer("organization_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  contactType: text("contact_type", {
    enum: ["elevator_company", "building_owner", "property_manager", "state_inspector", "other"],
  }).notNull(),
  companyName: text("company_name"),
  contactName: text("contact_name"),
  email: text("email").notNull(),
  phone: text("phone"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("contacts_org_idx").on(t.organizationId),
  index("contacts_customer_idx").on(t.customerId),
]);

export const insertContactSchema = createInsertSchema(contactsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Contact = typeof contactsTable.$inferSelect;
