import {
  pgTable,
  serial,
  integer,
  numeric,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const paymentsTable = pgTable("payments", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull().default("cash"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PaymentRow = typeof paymentsTable.$inferSelect;
export type InsertPayment = typeof paymentsTable.$inferInsert;
