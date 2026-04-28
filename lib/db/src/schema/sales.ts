import {
  pgTable,
  serial,
  text,
  integer,
  numeric,
  timestamp,
} from "drizzle-orm/pg-core";

export const salesTable = pgTable("sales", {
  id: serial("id").primaryKey(),
  invoiceNo: text("invoice_no").notNull().unique(),
  customerId: integer("customer_id").notNull(),
  bikeId: integer("bike_id").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  discount: numeric("discount", { precision: 12, scale: 2 }).notNull().default("0"),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  amountPaid: numeric("amount_paid", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  amountDue: numeric("amount_due", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull().default("cash"),
  paymentStatus: text("payment_status").notNull().default("unpaid"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SaleRow = typeof salesTable.$inferSelect;
export type InsertSale = typeof salesTable.$inferInsert;
