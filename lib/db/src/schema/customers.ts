import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const customersTable = pgTable("customers", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  address: text("address"),
  cnic: text("cnic"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CustomerRow = typeof customersTable.$inferSelect;
export type InsertCustomer = typeof customersTable.$inferInsert;
