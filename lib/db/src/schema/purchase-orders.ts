import {
  pgTable,
  serial,
  text,
  numeric,
  timestamp,
  integer,
  date,
} from "drizzle-orm/pg-core";
import { bikesTable } from "./bikes";
import { banksTable } from "./banks";

export const purchaseOrdersTable = pgTable("purchase_orders", {
  id: serial("id").primaryKey(),
  orderNo: text("order_no").notNull().unique(),
  supplierName: text("supplier_name").notNull(),
  bikeId: integer("bike_id")
    .notNull()
    .references(() => bikesTable.id),
  quantity: integer("quantity").notNull(),
  unitCost: numeric("unit_cost", { precision: 12, scale: 2 }).notNull(),
  totalCost: numeric("total_cost", { precision: 14, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"),
  bankId: integer("bank_id").references(() => banksTable.id, {
    onDelete: "set null",
  }),
  orderDate: date("order_date").notNull(),
  receivedDate: date("received_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type PurchaseOrderRow = typeof purchaseOrdersTable.$inferSelect;
export type InsertPurchaseOrder = typeof purchaseOrdersTable.$inferInsert;
