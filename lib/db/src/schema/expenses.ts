import {
  pgTable,
  serial,
  text,
  numeric,
  timestamp,
  integer,
  date,
} from "drizzle-orm/pg-core";
import { banksTable } from "./banks";

export const expensesTable = pgTable("expenses", {
  id: serial("id").primaryKey(),
  expenseDate: date("expense_date").notNull(),
  category: text("category").notNull().default("General"),
  description: text("description").notNull(),
  paidTo: text("paid_to"),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  bankId: integer("bank_id").references(() => banksTable.id, {
    onDelete: "set null",
  }),
  paymentMethod: text("payment_method").notNull().default("cash"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ExpenseRow = typeof expensesTable.$inferSelect;
export type InsertExpense = typeof expensesTable.$inferInsert;
