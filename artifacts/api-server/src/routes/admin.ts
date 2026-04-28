import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import {
  db,
  bikesTable,
  customersTable,
  paymentsTable,
  salesTable,
} from "@workspace/db";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();
router.use(requireAuth());

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function rowsToCsv(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(headers.map((h) => csvEscape(r[h])).join(","));
  }
  return lines.join("\n");
}

function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

function sqlValue(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (v instanceof Date) return `'${v.toISOString()}'`;
  return `'${String(v).replace(/'/g, "''")}'`;
}

function rowsToSqlInserts(table: string, rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return `-- no rows for ${table}\n`;
  const cols = Object.keys(rows[0]);
  const lines = [`-- Table: ${table}`];
  for (const r of rows) {
    lines.push(
      `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${cols.map((c) => sqlValue(r[c])).join(", ")});`,
    );
  }
  return lines.join("\n") + "\n";
}

router.get("/export/report", async (_req, res): Promise<void> => {
  const customers = await db.select().from(customersTable).orderBy(customersTable.id);
  const bikes = await db.select().from(bikesTable).orderBy(bikesTable.id);
  const sales = await db.select().from(salesTable).orderBy(desc(salesTable.createdAt));
  const payments = await db.select().from(paymentsTable).orderBy(desc(paymentsTable.createdAt));

  const stamp = timestamp();
  const totalRevenue = sales.reduce((s, x) => s + Number(x.amountPaid), 0);
  const totalDue = sales.reduce((s, x) => s + Number(x.amountDue), 0);

  const summary = {
    generatedAt: new Date().toISOString(),
    totals: {
      customers: customers.length,
      bikes: bikes.length,
      sales: sales.length,
      payments: payments.length,
      totalRevenue,
      totalDue,
      currentStock: bikes.reduce((s, b) => s + b.stock, 0),
    },
    customers,
    bikes,
    sales,
    payments,
  };

  res.setHeader("Content-Type", "application/json");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="rais-motors-report-${stamp}.json"`,
  );
  res.send(JSON.stringify(summary, null, 2));
});

router.get("/export/csv", async (_req, res): Promise<void> => {
  const which = String((_req.query as Record<string, unknown>).table ?? "sales");
  const stamp = timestamp();
  let rows: Array<Record<string, unknown>> = [];
  let label = which;
  if (which === "customers") {
    rows = await db.select().from(customersTable).orderBy(customersTable.id);
  } else if (which === "bikes") {
    rows = await db.select().from(bikesTable).orderBy(bikesTable.id);
  } else if (which === "payments") {
    rows = await db.select().from(paymentsTable).orderBy(desc(paymentsTable.createdAt));
  } else {
    rows = await db.select().from(salesTable).orderBy(desc(salesTable.createdAt));
    label = "sales";
  }
  const csv = rowsToCsv(rows.map((r) => JSON.parse(JSON.stringify(r)) as Record<string, unknown>));
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="rais-motors-${label}-${stamp}.csv"`,
  );
  res.send(csv);
});

router.get("/export/backup", async (_req, res): Promise<void> => {
  const customers = await db.select().from(customersTable).orderBy(customersTable.id);
  const bikes = await db.select().from(bikesTable).orderBy(bikesTable.id);
  const sales = await db.select().from(salesTable).orderBy(salesTable.id);
  const payments = await db.select().from(paymentsTable).orderBy(paymentsTable.id);

  const header = `-- Rais Motors database backup
-- Generated at ${new Date().toISOString()}
-- Tables: customers, bikes, sales, payments

`;

  const body =
    rowsToSqlInserts("customers", customers as unknown as Array<Record<string, unknown>>) +
    "\n" +
    rowsToSqlInserts("bikes", bikes as unknown as Array<Record<string, unknown>>) +
    "\n" +
    rowsToSqlInserts("sales", sales as unknown as Array<Record<string, unknown>>) +
    "\n" +
    rowsToSqlInserts("payments", payments as unknown as Array<Record<string, unknown>>);

  const stamp = timestamp();
  res.setHeader("Content-Type", "application/sql");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="rais-motors-backup-${stamp}.sql"`,
  );
  res.send(header + body);
});

export default router;
