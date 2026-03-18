import { pgTable, serial, text, real, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ticketsTable = pgTable("tickets", {
  id: serial("id").primaryKey(),
  serviceId: text("service_id").notNull().unique(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerEmail: text("customer_email"),
  deviceBrand: text("device_brand").notNull(),
  deviceModel: text("device_model").notNull(),
  problemDescription: text("problem_description").notNull(),
  status: text("status").notNull().default("received"),
  technicianId: integer("technician_id"),
  estimatedCompletion: text("estimated_completion"),
  workSummary: text("work_summary"),
  totalPartsAmount: real("total_parts_amount"),
  totalLaborAmount: real("total_labor_amount"),
  totalAmount: real("total_amount"),
  billConfirmed: boolean("bill_confirmed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const ticketPartsTable = pgTable("ticket_parts", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull(),
  partId: integer("part_id"),
  partName: text("part_name").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: real("unit_price").notNull(),
  totalPrice: real("total_price").notNull(),
  warrantyPeriod: text("warranty_period"),
  addedBy: integer("added_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const laborEntriesTable = pgTable("labor_entries", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull(),
  technicianId: integer("technician_id"),
  startTime: timestamp("start_time", { withTimezone: true }),
  endTime: timestamp("end_time", { withTimezone: true }),
  manualHours: real("manual_hours"),
  totalHours: real("total_hours"),
  laborCost: real("labor_cost"),
  isRunning: boolean("is_running").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const auditLogTable = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull(),
  action: text("action").notNull(),
  description: text("description").notNull(),
  technicianId: integer("technician_id"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTicketSchema = createInsertSchema(ticketsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertTicketPartSchema = createInsertSchema(ticketPartsTable).omit({
  id: true,
  createdAt: true,
});
export const insertLaborEntrySchema = createInsertSchema(laborEntriesTable).omit({
  id: true,
  createdAt: true,
});
export const insertAuditLogSchema = createInsertSchema(auditLogTable).omit({
  id: true,
  createdAt: true,
});

export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type Ticket = typeof ticketsTable.$inferSelect;
export type TicketPart = typeof ticketPartsTable.$inferSelect;
export type LaborEntry = typeof laborEntriesTable.$inferSelect;
export type AuditLogEntry = typeof auditLogTable.$inferSelect;
