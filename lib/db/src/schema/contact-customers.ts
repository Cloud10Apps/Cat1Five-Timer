import { pgTable, serial, integer, timestamp, unique, index } from "drizzle-orm/pg-core";
import { contactsTable } from "./contacts";
import { customersTable } from "./customers";

export const contactCustomersTable = pgTable("contact_customers", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").notNull().references(() => contactsTable.id, { onDelete: "cascade" }),
  customerId: integer("customer_id").notNull().references(() => customersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("contact_customer_unique").on(t.contactId, t.customerId),
  index("contact_customers_contact_idx").on(t.contactId),
  index("contact_customers_customer_idx").on(t.customerId),
]);

export type ContactCustomer = typeof contactCustomersTable.$inferSelect;
