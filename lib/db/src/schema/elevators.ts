import { pgTable, text, serial, timestamp, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";
import { buildingsTable } from "./buildings";

export const elevatorsTable = pgTable("elevators", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  internalId: text("internal_id"),
  stateId: text("state_id"),
  description: text("description"),
  bank: text("bank"),
  type: text("type", { enum: ["traction", "hydraulic", "other"] }).notNull().default("traction"),
  manufacturer: text("manufacturer"),
  elevatorType: text("elevator_type", { enum: ["passenger", "freight"] }),
  oemSerialNumber: text("oem_serial_number"),
  capacity: text("capacity"),
  speed: text("speed"),
  yearInstalled: integer("year_installed"),
  numLandings: integer("num_landings"),
  numOpenings: integer("num_openings"),
  locationId: text("location_id"),
  buildingId: integer("building_id").notNull().references(() => buildingsTable.id, { onDelete: "cascade" }),
  organizationId: integer("organization_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("elevators_org_idx").on(t.organizationId),
  index("elevators_building_idx").on(t.buildingId),
]);

export const insertElevatorSchema = createInsertSchema(elevatorsTable).omit({ id: true, createdAt: true });
export type InsertElevator = z.infer<typeof insertElevatorSchema>;
export type Elevator = typeof elevatorsTable.$inferSelect;
