import { Router, type IRouter } from "express";
import { eq, desc, sql, and, gte } from "drizzle-orm";
import {
  db,
  expensesTable,
  banksTable,
  bankTransactionsTable,
} from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { serializeExpense } from "../lib/serialize";

const router: IRouter = Router();
router.use(requireAuth());

router.get("/expenses", async (req, res): Promise<void> => {
  const period = String((req.query as Record<string, unknown>).period ?? "all");
  let where;
  const now = new Date();
  if (period === "monthly")
    where = gte(
      expensesTable.expenseDate,
      new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
    );
  else if (period === "yearly")
    where = gte(
      expensesTable.expenseDate,
      new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10),
    );
  const rows = await db
    .select({ expense: expensesTable, bank: banksTable })
    .from(expensesTable)
    .leftJoin(banksTable, eq(banksTable.id, expensesTable.bankId))
    .where(where)
    .orderBy(desc(expensesTable.expenseDate), desc(expensesTable.id))
    .limit(500);
  res.json(rows.map((r) => serializeExpense(r.expense, r.bank)));
});

router.get("/expenses/summary", async (_req, res): Promise<void> => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const yearStart = new Date(now.getFullYear(), 0, 1)
    .toISOString()
    .slice(0, 10);

  const [tot] = await db
    .select({ total: sql<string>`coalesce(sum(${expensesTable.amount}), 0)` })
    .from(expensesTable);
  const [mon] = await db
    .select({ total: sql<string>`coalesce(sum(${expensesTable.amount}), 0)` })
    .from(expensesTable)
    .where(gte(expensesTable.expenseDate, monthStart));
  const [yr] = await db
    .select({ total: sql<string>`coalesce(sum(${expensesTable.amount}), 0)` })
    .from(expensesTable)
    .where(gte(expensesTable.expenseDate, yearStart));

  res.json({
    total: Number(tot?.total ?? 0),
    month: Number(mon?.total ?? 0),
    year: Number(yr?.total ?? 0),
  });
});

router.post("/expenses", async (req, res): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  const amount = Number(body.amount ?? 0);
  if (!body.description || !Number.isFinite(amount) || amount <= 0) {
    res.status(400).json({ error: "description and positive amount required" });
    return;
  }
  const expenseDate =
    typeof body.expenseDate === "string"
      ? body.expenseDate
      : new Date().toISOString().slice(0, 10);
  const bankId =
    body.bankId !== undefined && body.bankId !== null && body.bankId !== ""
      ? Number(body.bankId)
      : null;

  const [exp] = await db
    .insert(expensesTable)
    .values({
      expenseDate,
      category: typeof body.category === "string" ? body.category : "General",
      description: String(body.description),
      paidTo: typeof body.paidTo === "string" ? body.paidTo : null,
      amount: String(amount),
      bankId,
      paymentMethod:
        typeof body.paymentMethod === "string" ? body.paymentMethod : "cash",
      notes: typeof body.notes === "string" ? body.notes : null,
    })
    .returning();

  if (bankId) {
    await db.insert(bankTransactionsTable).values({
      bankId,
      type: "debit",
      amount: String(amount),
      description: `Expense: ${exp.description}`,
      refType: "expense",
      refId: exp.id,
    });
  }

  let bank = null;
  if (bankId) {
    const [b] = await db.select().from(banksTable).where(eq(banksTable.id, bankId));
    bank = b ?? null;
  }
  res.json(serializeExpense(exp, bank));
});

router.patch("/expenses/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const body = req.body as Record<string, unknown>;
  const [exp] = await db
    .update(expensesTable)
    .set({
      expenseDate:
        typeof body.expenseDate === "string" ? body.expenseDate : undefined,
      category: typeof body.category === "string" ? body.category : undefined,
      description:
        typeof body.description === "string" ? body.description : undefined,
      paidTo: body.paidTo === undefined ? undefined : (body.paidTo as string | null),
      amount:
        body.amount !== undefined ? String(Number(body.amount)) : undefined,
      paymentMethod:
        typeof body.paymentMethod === "string"
          ? body.paymentMethod
          : undefined,
      notes: body.notes === undefined ? undefined : (body.notes as string | null),
    })
    .where(eq(expensesTable.id, id))
    .returning();
  if (!exp) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }
  res.json(serializeExpense(exp, null));
});

router.delete("/expenses/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  await db
    .delete(bankTransactionsTable)
    .where(
      and(
        eq(bankTransactionsTable.refType, "expense"),
        eq(bankTransactionsTable.refId, id),
      ),
    );
  const [exp] = await db
    .delete(expensesTable)
    .where(eq(expensesTable.id, id))
    .returning();
  if (!exp) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }
  res.json({ success: true });
});

export default router;
