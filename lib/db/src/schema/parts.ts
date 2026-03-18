import { pgTable, serial, text, real, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const partsTable = pgTable("parts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  partNumber: text("part_number"),
  description: text("description"),
  barcode: text("barcode"),
  costPrice: real("cost_price").notNull().default(0),
  defaultPrice: real("default_price").notNull().default(0),
  stockQuantity: integer("stock_quantity").notNull().default(0),
  category: text("category"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPartSchema = createInsertSchema(partsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertPart = z.infer<typeof insertPartSchema>;
export type Part = typeof partsTable.$inferSelect;
