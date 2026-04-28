import {
  pgTable,
  serial,
  text,
  integer,
  numeric,
  timestamp,
} from "drizzle-orm/pg-core";

export const bikesTable = pgTable("bikes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  category: text("category").notNull(),
  color: text("color").notNull().default(""),
  engineCc: integer("engine_cc"),
  purchasePrice: numeric("purchase_price", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  salePrice: numeric("sale_price", { precision: 12, scale: 2 }).notNull(),
  stock: integer("stock").notNull().default(0),
  lowStockThreshold: integer("low_stock_threshold").notNull().default(2),
  sku: text("sku").notNull().unique(),
  imageUrl: text("image_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type BikeRow = typeof bikesTable.$inferSelect;
export type InsertBike = typeof bikesTable.$inferInsert;
