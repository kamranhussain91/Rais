import {
  pgTable,
  serial,
  text,
  numeric,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";

export const banksTable = pgTable("banks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  accountNumber: text("account_number"),
  openingBalance: numeric("opening_balance", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const bankTransactionsTable = pgTable("bank_transactions", {
  id: serial("id").primaryKey(),
  bankId: integer("bank_id")
    .notNull()
    .references(() => banksTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  description: text("description").notNull().default(""),
  refType: text("ref_type"),
  refId: integer("ref_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type BankRow = typeof banksTable.$inferSelect;
export type InsertBank = typeof banksTable.$inferInsert;
export type BankTransactionRow = typeof bankTransactionsTable.$inferSelect;
export type InsertBankTransaction = typeof bankTransactionsTable.$inferInsert;
