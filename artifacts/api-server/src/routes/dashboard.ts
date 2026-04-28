import { Router, type IRouter } from "express";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import {
  db,
  bikesTable,
  customersTable,
  salesTable,
  expensesTable,
} from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { serializeSale } from "../lib/serialize";

const router: IRouter = Router();
router.use(requireAuth());

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);

  const [totals] = await db
    .select({
      totalRevenue: sql<string>`coalesce(sum(${salesTable.amountPaid}), 0)`,
      totalSales: sql<number>`count(*)`,
      pendingPayments: sql<string>`coalesce(sum(${salesTable.amountDue}), 0)`,
    })
    .from(salesTable);

  const [monthAgg] = await db
    .select({
      revenue: sql<string>`coalesce(sum(${salesTable.amountPaid}), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(salesTable)
    .where(gte(salesTable.createdAt, monthStart));

  const [weekAgg] = await db
    .select({
      revenue: sql<string>`coalesce(sum(${salesTable.amountPaid}), 0)`,
    })
    .from(salesTable)
    .where(gte(salesTable.createdAt, weekStart));

  const [bikeAgg] = await db
    .select({
      totalBikes: sql<number>`count(*)`,
      totalStock: sql<string>`coalesce(sum(${bikesTable.stock}), 0)`,
      lowStock: sql<number>`count(*) filter (where ${bikesTable.stock} <= ${bikesTable.lowStockThreshold} and ${bikesTable.stock} > 0)`,
    })
    .from(bikesTable);

  const [custAgg] = await db
    .select({ totalCustomers: sql<number>`count(*)` })
    .from(customersTable);

  res.json({
    totalRevenue: Number(totals?.totalRevenue ?? 0),
    totalSales: Number(totals?.totalSales ?? 0),
    totalBikes: Number(bikeAgg?.totalBikes ?? 0),
    totalStock: Number(bikeAgg?.totalStock ?? 0),
    totalCustomers: Number(custAgg?.totalCustomers ?? 0),
    pendingPayments: Number(totals?.pendingPayments ?? 0),
    monthRevenue: Number(monthAgg?.revenue ?? 0),
    monthSales: Number(monthAgg?.count ?? 0),
    weekRevenue: Number(weekAgg?.revenue ?? 0),
    lowStockCount: Number(bikeAgg?.lowStock ?? 0),
  });
});

router.get("/dashboard/monthly-revenue", async (_req, res): Promise<void> => {
  const start = new Date();
  start.setMonth(start.getMonth() - 11);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const rows = await db
    .select({
      month: sql<string>`to_char(date_trunc('month', ${salesTable.createdAt}), 'YYYY-MM')`,
      revenue: sql<string>`coalesce(sum(${salesTable.amountPaid}), 0)`,
      sales: sql<number>`count(*)`,
    })
    .from(salesTable)
    .where(gte(salesTable.createdAt, start))
    .groupBy(sql`date_trunc('month', ${salesTable.createdAt})`)
    .orderBy(sql`date_trunc('month', ${salesTable.createdAt})`);

  const lookup = new Map(
    rows.map((r) => [r.month, { revenue: Number(r.revenue), sales: Number(r.sales) }]),
  );
  const result: Array<{ month: string; revenue: number; sales: number }> = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const entry = lookup.get(key) ?? { revenue: 0, sales: 0 };
    result.push({ month: key, ...entry });
  }
  res.json(result);
});

router.get("/dashboard/weekly-sales", async (_req, res): Promise<void> => {
  const start = new Date();
  start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);

  const rows = await db
    .select({
      date: sql<string>`to_char(date_trunc('day', ${salesTable.createdAt}), 'YYYY-MM-DD')`,
      sales: sql<number>`count(*)`,
      revenue: sql<string>`coalesce(sum(${salesTable.amountPaid}), 0)`,
    })
    .from(salesTable)
    .where(gte(salesTable.createdAt, start))
    .groupBy(sql`date_trunc('day', ${salesTable.createdAt})`)
    .orderBy(sql`date_trunc('day', ${salesTable.createdAt})`);

  const lookup = new Map(
    rows.map((r) => [r.date, { sales: Number(r.sales), revenue: Number(r.revenue) }]),
  );
  const result: Array<{ date: string; sales: number; revenue: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const entry = lookup.get(key) ?? { sales: 0, revenue: 0 };
    result.push({ date: key, ...entry });
  }
  res.json(result);
});

router.get("/dashboard/best-sellers", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      bikeId: salesTable.bikeId,
      name: bikesTable.name,
      brand: bikesTable.brand,
      unitsSold: sql<number>`coalesce(sum(${salesTable.quantity}), 0)`,
      revenue: sql<string>`coalesce(sum(${salesTable.amountPaid}), 0)`,
    })
    .from(salesTable)
    .innerJoin(bikesTable, eq(bikesTable.id, salesTable.bikeId))
    .groupBy(salesTable.bikeId, bikesTable.name, bikesTable.brand)
    .orderBy(desc(sql`sum(${salesTable.quantity})`))
    .limit(5);
  res.json(
    rows.map((r) => ({
      bikeId: r.bikeId,
      name: r.name,
      brand: r.brand,
      unitsSold: Number(r.unitsSold),
      revenue: Number(r.revenue),
    })),
  );
});

router.get("/dashboard/recent-sales", async (_req, res): Promise<void> => {
  const rows = await db
    .select({ sale: salesTable, customer: customersTable, bike: bikesTable })
    .from(salesTable)
    .innerJoin(customersTable, eq(customersTable.id, salesTable.customerId))
    .innerJoin(bikesTable, eq(bikesTable.id, salesTable.bikeId))
    .orderBy(desc(salesTable.createdAt))
    .limit(8);
  res.json(rows.map((r) => serializeSale(r.sale, r.customer, r.bike)));
});

function periodRange(period: string): { start: Date | null; label: string } {
  const now = new Date();
  if (period === "daily" || period === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { start, label: "Today" };
  }
  if (period === "weekly" || period === "week") {
    const start = new Date(now);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return { start, label: "Last 7 Days" };
  }
  if (period === "monthly" || period === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start, label: "This Month" };
  }
  if (period === "yearly" || period === "year") {
    const start = new Date(now.getFullYear(), 0, 1);
    return { start, label: "This Year" };
  }
  return { start: null, label: "All Time" };
}

router.get("/dashboard/period-stats", async (req, res): Promise<void> => {
  const period = String((req.query as Record<string, unknown>).period ?? "monthly");
  const { start, label } = periodRange(period);

  const where = start ? gte(salesTable.createdAt, start) : undefined;

  const baseQuery = db
    .select({
      revenue: sql<string>`coalesce(sum(${salesTable.amountPaid}), 0)`,
      total: sql<string>`coalesce(sum(${salesTable.totalAmount}), 0)`,
      due: sql<string>`coalesce(sum(${salesTable.amountDue}), 0)`,
      sales: sql<number>`count(*)`,
      uniqueCustomers: sql<number>`count(distinct ${salesTable.customerId})`,
    })
    .from(salesTable);

  const [stats] = where ? await baseQuery.where(where) : await baseQuery;

  const sales = Number(stats?.sales ?? 0);
  const revenue = Number(stats?.revenue ?? 0);
  res.json({
    period,
    label,
    revenue,
    total: Number(stats?.total ?? 0),
    due: Number(stats?.due ?? 0),
    sales,
    uniqueCustomers: Number(stats?.uniqueCustomers ?? 0),
    averageSale: sales > 0 ? Math.round(revenue / sales) : 0,
  });
});

router.get("/dashboard/profit", async (req, res): Promise<void> => {
  const period = String((req.query as Record<string, unknown>).period ?? "all");
  const { start, label } = periodRange(period);

  const saleWhere = start ? gte(salesTable.createdAt, start) : undefined;
  const profitQuery = db
    .select({
      revenue: sql<string>`coalesce(sum(${salesTable.totalAmount}), 0)`,
      cost: sql<string>`coalesce(sum(${salesTable.quantity} * ${bikesTable.purchasePrice}), 0)`,
      sales: sql<number>`count(*)`,
    })
    .from(salesTable)
    .innerJoin(bikesTable, eq(bikesTable.id, salesTable.bikeId));
  const [profit] = saleWhere
    ? await profitQuery.where(saleWhere)
    : await profitQuery;

  const expenseDateStr = start ? start.toISOString().slice(0, 10) : null;
  const expenseQuery = db
    .select({
      total: sql<string>`coalesce(sum(${expensesTable.amount}), 0)`,
    })
    .from(expensesTable);
  const [expSum] = expenseDateStr
    ? await expenseQuery.where(gte(expensesTable.expenseDate, expenseDateStr))
    : await expenseQuery;

  const revenue = Number(profit?.revenue ?? 0);
  const cost = Number(profit?.cost ?? 0);
  const expenses = Number(expSum?.total ?? 0);
  const grossProfit = revenue - cost;
  const netProfit = grossProfit - expenses;

  res.json({
    period,
    label,
    revenue,
    cost,
    grossProfit,
    expenses,
    netProfit,
    sales: Number(profit?.sales ?? 0),
    margin: revenue > 0 ? Math.round((grossProfit / revenue) * 1000) / 10 : 0,
  });
});

router.get("/dashboard/pending-payments", async (_req, res): Promise<void> => {
  const rows = await db
    .select({ sale: salesTable, customer: customersTable, bike: bikesTable })
    .from(salesTable)
    .innerJoin(customersTable, eq(customersTable.id, salesTable.customerId))
    .innerJoin(bikesTable, eq(bikesTable.id, salesTable.bikeId))
    .where(
      and(
        sql`${salesTable.paymentStatus} != 'paid'`,
      ),
    )
    .orderBy(desc(salesTable.createdAt));
  res.json(rows.map((r) => serializeSale(r.sale, r.customer, r.bike)));
});

export default router;
