import { Router, type IRouter } from "express";
import { eq, desc, sql, and } from "drizzle-orm";
import {
  db,
  purchaseOrdersTable,
  bikesTable,
  banksTable,
  bankTransactionsTable,
} from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { serializePurchaseOrder } from "../lib/serialize";

const router: IRouter = Router();
router.use(requireAuth());

async function nextOrderNo(): Promise<string> {
  const [row] = await db
    .select({ max: sql<number>`coalesce(max(${purchaseOrdersTable.id}), 0)` })
    .from(purchaseOrdersTable);
  const next = (row?.max ?? 0) + 1;
  return `PO-${new Date().getFullYear()}-${String(next).padStart(5, "0")}`;
}

router.get("/purchase-orders", async (_req, res): Promise<void> => {
  const rows = await db
    .select({ po: purchaseOrdersTable, bike: bikesTable, bank: banksTable })
    .from(purchaseOrdersTable)
    .leftJoin(bikesTable, eq(bikesTable.id, purchaseOrdersTable.bikeId))
    .leftJoin(banksTable, eq(banksTable.id, purchaseOrdersTable.bankId))
    .orderBy(desc(purchaseOrdersTable.orderDate), desc(purchaseOrdersTable.id))
    .limit(300);
  res.json(rows.map((r) => serializePurchaseOrder(r.po, r.bike, r.bank)));
});

router.post("/purchase-orders", async (req, res): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  const bikeId = Number(body.bikeId ?? 0);
  const quantity = Number(body.quantity ?? 0);
  const unitCost = Number(body.unitCost ?? 0);
  if (
    !bikeId ||
    !Number.isFinite(quantity) ||
    quantity <= 0 ||
    !Number.isFinite(unitCost) ||
    unitCost <= 0 ||
    !body.supplierName
  ) {
    res
      .status(400)
      .json({ error: "supplierName, bikeId, quantity, unitCost are required" });
    return;
  }
  const [bike] = await db
    .select()
    .from(bikesTable)
    .where(eq(bikesTable.id, bikeId));
  if (!bike) {
    res.status(400).json({ error: "Bike not found" });
    return;
  }
  const totalCost = quantity * unitCost;
  const orderDate =
    typeof body.orderDate === "string"
      ? body.orderDate
      : new Date().toISOString().slice(0, 10);
  const bankId =
    body.bankId !== undefined && body.bankId !== null && body.bankId !== ""
      ? Number(body.bankId)
      : null;
  const status = typeof body.status === "string" ? body.status : "pending";
  const orderNo = await nextOrderNo();

  const [po] = await db
    .insert(purchaseOrdersTable)
    .values({
      orderNo,
      supplierName: String(body.supplierName),
      bikeId,
      quantity,
      unitCost: String(unitCost),
      totalCost: String(totalCost),
      status,
      bankId,
      orderDate,
      receivedDate:
        status === "received" ? orderDate : null,
      notes: typeof body.notes === "string" ? body.notes : null,
    })
    .returning();

  if (status === "received") {
    await db
      .update(bikesTable)
      .set({ stock: bike.stock + quantity })
      .where(eq(bikesTable.id, bikeId));
  }

  if (bankId) {
    await db.insert(bankTransactionsTable).values({
      bankId,
      type: "debit",
      amount: String(totalCost),
      description: `Purchase ${orderNo} - ${bike.brand} ${bike.name} x${quantity}`,
      refType: "purchase_order",
      refId: po.id,
    });
  }

  let bank = null;
  if (bankId) {
    const [b] = await db.select().from(banksTable).where(eq(banksTable.id, bankId));
    bank = b ?? null;
  }
  res.json(serializePurchaseOrder(po, bike, bank));
});

router.post("/purchase-orders/:id/receive", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [po] = await db
    .select()
    .from(purchaseOrdersTable)
    .where(eq(purchaseOrdersTable.id, id));
  if (!po) {
    res.status(404).json({ error: "Purchase order not found" });
    return;
  }
  if (po.status === "received") {
    res.status(400).json({ error: "Already received" });
    return;
  }
  const [bike] = await db
    .select()
    .from(bikesTable)
    .where(eq(bikesTable.id, po.bikeId));
  if (bike) {
    await db
      .update(bikesTable)
      .set({ stock: bike.stock + po.quantity })
      .where(eq(bikesTable.id, bike.id));
  }
  const [updated] = await db
    .update(purchaseOrdersTable)
    .set({
      status: "received",
      receivedDate: new Date().toISOString().slice(0, 10),
    })
    .where(eq(purchaseOrdersTable.id, id))
    .returning();
  res.json(serializePurchaseOrder(updated, bike, null));
});

router.delete("/purchase-orders/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  await db
    .delete(bankTransactionsTable)
    .where(
      and(
        eq(bankTransactionsTable.refType, "purchase_order"),
        eq(bankTransactionsTable.refId, id),
      ),
    );
  const [po] = await db
    .delete(purchaseOrdersTable)
    .where(eq(purchaseOrdersTable.id, id))
    .returning();
  if (!po) {
    res.status(404).json({ error: "Purchase order not found" });
    return;
  }
  res.json({ success: true });
});

export default router;
