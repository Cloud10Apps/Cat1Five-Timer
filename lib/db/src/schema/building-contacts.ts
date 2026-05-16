import { pgTable, serial, integer, timestamp, boolean, unique, index } from "drizzle-orm/pg-core";
import { buildingsTable } from "./buildings";
import { contactsTable } from "./contacts";

export const buildingContactsTable = pgTable("building_contacts", {
  id: serial("id").primaryKey(),
  buildingId: integer("building_id").notNull().references(() => buildingsTable.id, { onDelete: "cascade" }),
  contactId: integer("contact_id").notNull().references(() => contactsTable.id, { onDelete: "cascade" }),
  receivesNotifications: boolean("receives_notifications").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("building_contact_unique").on(t.buildingId, t.contactId),
  index("building_contacts_building_idx").on(t.buildingId),
  index("building_contacts_contact_idx").on(t.contactId),
]);

export type BuildingContact = typeof buildingContactsTable.$inferSelect;
