import { pgTable, serial, real, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  hourlyRate: real("hourly_rate").notNull().default(30),
  vatRate: real("vat_rate").notNull().default(24),
  twilioAccountSid: text("twilio_account_sid"),
  twilioAuthToken: text("twilio_auth_token"),
  twilioFromNumber: text("twilio_from_number"),
  emailHost: text("email_host"),
  emailPort: integer("email_port"),
  emailUser: text("email_user"),
  emailPass: text("email_pass"),
  emailFrom: text("email_from"),
  shopName: text("shop_name").default("Υπηρεσία Επισκευής"),
  shopPhone: text("shop_phone"),
  printerIp: text("printer_ip"),
  printerPort: integer("printer_port").default(9100),
  smsTemplate: text("sms_template").default("Your device {{deviceBrand}} {{deviceModel}} (Service ID: {{serviceId}}) is ready for pickup. Please visit us at your earliest convenience."),
  emailTemplate: text("email_template").default("Dear {{customerName}},\n\nYour device {{deviceBrand}} {{deviceModel}} (Service ID: {{serviceId}}) has been repaired and is ready for pickup.\n\nThank you for choosing our service."),
  deviceBrands: text("device_brands"),
  commonIssues: text("common_issues"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSettingsSchema = createInsertSchema(settingsTable).omit({
  id: true,
  updatedAt: true,
});

export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settingsTable.$inferSelect;
