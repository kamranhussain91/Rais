import { Router, type IRouter } from "express";
import { eq, sql, desc } from "drizzle-orm";
import { db, banksTable, bankTransactionsTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { serializeBank, serializeBankTransaction } from "../lib/serialize";

const router: IRouter = Router();
router.use(requireAuth());

async function bankBalances(): Promise<Map<number, number>> {
  const rows = await db
    .select({
      bankId: bankTransactionsTable.bankId,
      net: sql<string>`coalesce(sum(case when ${bankTransactionsTable.type} = 'credit' then ${bankTransactionsTable.amount} else -${bankTransactionsTable.amount} end), 0)`,
    })
    .from(bankTransactionsTable)
    .groupBy(bankTransactionsTable.bankId);
  const map = new Map<number, number>();
  for (const r of rows) map.set(r.bankId, Number(r.net));
  return map;
}

router.get("/banks", async (_req, res): Promise<void> => {
  const banks = await db.select().from(banksTable).orderBy(banksTable.id);
  const balances = await bankBalances();
  res.json(
    banks.map((b) =>
      serializeBank(b, Number(b.openingBalance) + (balances.get(b.id) ?? 0)),
    ),
  );
});

router.post("/banks", async (req, res): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  if (!body.name || typeof body.name !== "string") {
    res.status(400).json({ error: "name is required" });
    return;
  }
  const [bank] = await db
    .insert(banksTable)
    .values({
      name: body.name,
      accountNumber:
        typeof body.accountNumber === "string" ? body.accountNumber : null,
      openingBalance: String(Number(body.openingBalance ?? 0)),
      notes: typeof body.notes === "string" ? body.notes : null,
    })
    .returning();
  res.json(serializeBank(bank, Number(bank.openingBalance)));
});

router.patch("/banks/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const body = req.body as Record<string, unknown>;
  const [bank] = await db
    .update(banksTable)
    .set({
      name: typeof body.name === "string" ? body.name : undefined,
      accountNumber:
        typeof body.accountNumber === "string" ? body.accountNumber : null,
      openingBalance:
        body.openingBalance !== undefined
          ? String(Number(body.openingBalance))
          : undefined,
      notes: typeof body.notes === "string" ? body.notes : null,
    })
    .where(eq(banksTable.id, id))
    .returning();
  if (!bank) {
    res.status(404).json({ error: "Bank not found" });
    return;
  }
  const balances = await bankBalances();
  res.json(
    serializeBank(bank, Number(bank.openingBalance) + (balances.get(bank.id) ?? 0)),
  );
});

router.delete("/banks/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [bank] = await db
    .delete(banksTable)
    .where(eq(banksTable.id, id))
    .returning();
  if (!bank) {
    res.status(404).json({ error: "Bank not found" });
    return;
  }
  res.json({ success: true });
});

router.get("/banks/:id/transactions", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [bank] = await db.select().from(banksTable).where(eq(banksTable.id, id));
  if (!bank) {
    res.status(404).json({ error: "Bank not found" });
    return;
  }
  const txns = await db
    .select()
    .from(bankTransactionsTable)
    .where(eq(bankTransactionsTable.bankId, id))
    .orderBy(desc(bankTransactionsTable.createdAt))
    .limit(200);
  res.json(txns.map((t) => serializeBankTransaction(t, bank)));
});

router.post("/banks/:id/transactions", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const body = req.body as Record<string, unknown>;
  const type = String(body.type ?? "credit");
  const amount = Number(body.amount ?? 0);
  if (!["credit", "debit"].includes(type) || !Number.isFinite(amount) || amount <= 0) {
    res.status(400).json({ error: "Invalid type or amount" });
    return;
  }
  const [bank] = await db.select().from(banksTable).where(eq(banksTable.id, id));
  if (!bank) {
    res.status(404).json({ error: "Bank not found" });
    return;
  }
  const [txn] = await db
    .insert(bankTransactionsTable)
    .values({
      bankId: id,
      type,
      amount: String(amount),
      description: typeof body.description === "string" ? body.description : "",
    })
    .returning();
  res.json(serializeBankTransaction(txn, bank));
});

export default router;
