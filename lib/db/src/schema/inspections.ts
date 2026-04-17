import { pgTable, text, serial, timestamp, integer, date, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";
import { elevatorsTable } from "./elevators";

export const inspectionsTable = pgTable("inspections", {
  id: serial("id").primaryKey(),
  elevatorId: integer("elevator_id").notNull().references(() => elevatorsTable.id, { onDelete: "cascade" }),
  organizationId: integer("organization_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  inspectionType: text("inspection_type", { enum: ["CAT1", "CAT5"] }).notNull(),
  recurrenceYears: integer("recurrence_years").notNull().default(1),
  lastInspectionDate: date("last_inspection_date"),
  nextDueDate: date("next_due_date"),
  scheduledDate: date("scheduled_date"),
  completionDate: date("completion_date"),
  status: text("status", { enum: ["NOT_STARTED", "SCHEDULED", "IN_PROGRESS", "COMPLETED"] }).notNull().default("NOT_STARTED"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("inspections_org_idx").on(t.organizationId),
  index("inspections_elevator_idx").on(t.elevatorId),
  index("inspections_status_idx").on(t.status),
  index("inspections_next_due_idx").on(t.nextDueDate),
]);

export const insertInspectionSchema = createInsertSchema(inspectionsTable).omit({ id: true, createdAt: true });
export type InsertInspection = z.infer<typeof insertInspectionSchema>;
export type Inspection = typeof inspectionsTable.$inferSelect;
