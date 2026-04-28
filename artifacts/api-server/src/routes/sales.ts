import { Router, type IRouter } from "express";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import {
  db,
  bikesTable,
  customersTable,
  paymentsTable,
  salesTable,
} from "@workspace/db";
import {
  CreateSaleBody,
  ListSalesQueryParams,
  GetSaleParams,
  DeleteSaleParams,
  AddSalePaymentParams,
  AddSalePaymentBody,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { serializeSale } from "../lib/serialize";

const router: IRouter = Router();
router.use(requireAuth());

function paymentStatus(total: number, paid: number): "paid" | "partial" | "unpaid" {
  if (paid >= total - 0.01) return "paid";
  if (paid > 0) return "partial";
  return "unpaid";
}

async function nextInvoiceNo(): Promise<string> {
  const [row] = await db
    .select({ max: sql<number>`coalesce(max(${salesTable.id}), 0)` })
    .from(salesTable);
  const next = (row?.max ?? 0) + 1;
  const year = new Date().getFullYear();
  return `RM-${year}-${String(next).padStart(5, "0")}`;
}

router.get("/sales", async (req, res): Promise<void> => {
  const q = ListSalesQueryParams.safeParse(req.query);
  if (!q.success) {
    res.status(400).json({ error: q.error.message });
    return;
  }
  const { search, paymentStatus: status } = q.data;
  const filters = [];
  if (status) filters.push(eq(salesTable.paymentStatus, status));
  if (search) {
    filters.push(
      or(
        ilike(salesTable.invoiceNo, `%${search}%`),
        ilike(customersTable.fullName, `%${search}%`),
        ilike(bikesTable.name, `%${search}%`),
      ),
    );
  }
  const rows = await db
    .select({ sale: salesTable, customer: customersTable, bike: bikesTable })
    .from(salesTable)
    .innerJoin(customersTable, eq(customersTable.id, salesTable.customerId))
    .innerJoin(bikesTable, eq(bikesTable.id, salesTable.bikeId))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(salesTable.createdAt))
    .limit(search || status ? 500 : 200);
  res.json(rows.map((r) => serializeSale(r.sale, r.customer, r.bike)));
});

router.post("/sales", async (req, res): Promise<void> => {
  const parsed = CreateSaleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;
  const [bike] = await db.select().from(bikesTable).where(eq(bikesTable.id, data.bikeId));
  if (!bike) {
    res.status(400).json({ error: "Bike not found" });
    return;
  }
  if (bike.stock < data.quantity) {
    res.status(400).json({ error: "Insufficient stock" });
    return;
  }
  const [customer] = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.id, data.customerId));
  if (!customer) {
    res.status(400).json({ error: "Customer not found" });
    return;
  }
  const subtotal = data.unitPrice * data.quantity;
  const discount = data.discount ?? 0;
  const total = Math.max(0, subtotal - discount);
  const paid = data.amountPaid;
  const due = Math.max(0, total - paid);
  const status = paymentStatus(total, paid);
  const invoiceNo = await nextInvoiceNo();

  const [sale] = await db
    .insert(salesTable)
    .values({
      invoiceNo,
      customerId: data.customerId,
      bikeId: data.bikeId,
      quantity: data.quantity,
      unitPrice: String(data.unitPrice),
      discount: String(discount),
      totalAmount: String(total),
      amountPaid: String(paid),
      amountDue: String(due),
      paymentMethod: data.paymentMethod,
      paymentStatus: status,
      notes: data.notes ?? null,
    })
    .returning();

  if (paid > 0) {
    await db.insert(paymentsTable).values({
      saleId: sale.id,
      amount: String(paid),
      paymentMethod: data.paymentMethod,
      note: "Initial payment",
    });
  }

  await db
    .update(bikesTable)
    .set({ stock: bike.stock - data.quantity })
    .where(eq(bikesTable.id, bike.id));

  const [updatedBike] = await db
    .select()
    .from(bikesTable)
    .where(eq(bikesTable.id, bike.id));
  res.json(serializeSale(sale, customer, updatedBike));
});

router.get("/sales/:id", async (req, res): Promise<void> => {
  const p = GetSaleParams.safeParse(req.params);
  if (!p.success) {
    res.status(400).json({ error: p.error.message });
    return;
  }
  const [row] = await db
    .select({ sale: salesTable, customer: customersTable, bike: bikesTable })
    .from(salesTable)
    .innerJoin(customersTable, eq(customersTable.id, salesTable.customerId))
    .innerJoin(bikesTable, eq(bikesTable.id, salesTable.bikeId))
    .where(eq(salesTable.id, p.data.id));
  if (!row) {
    res.status(404).json({ error: "Sale not found" });
    return;
  }
  res.json(serializeSale(row.sale, row.customer, row.bike));
});

router.delete("/sales/:id", async (req, res): Promise<void> => {
  const p = DeleteSaleParams.safeParse(req.params);
  if (!p.success) {
    res.status(400).json({ error: p.error.message });
    return;
  }
  const [sale] = await db
    .select()
    .from(salesTable)
    .where(eq(salesTable.id, p.data.id));
  if (!sale) {
    res.status(404).json({ error: "Sale not found" });
    return;
  }
  await db.delete(paymentsTable).where(eq(paymentsTable.saleId, sale.id));
  await db.delete(salesTable).where(eq(salesTable.id, sale.id));
  await db
    .update(bikesTable)
    .set({
      stock: sql`${bikesTable.stock} + ${sale.quantity}`,
    })
    .where(eq(bikesTable.id, sale.bikeId));
  res.json({ success: true });
});

router.post("/sales/:id/payments", async (req, res): Promise<void> => {
  const p = AddSalePaymentParams.safeParse(req.params);
  if (!p.success) {
    res.status(400).json({ error: p.error.message });
    return;
  }
  const parsed = AddSalePaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [sale] = await db
    .select()
    .from(salesTable)
    .where(eq(salesTable.id, p.data.id));
  if (!sale) {
    res.status(404).json({ error: "Sale not found" });
    return;
  }
  const newPaid = Number(sale.amountPaid) + parsed.data.amount;
  const total = Number(sale.totalAmount);
  const due = Math.max(0, total - newPaid);
  const status = paymentStatus(total, newPaid);

  await db.insert(paymentsTable).values({
    saleId: sale.id,
    amount: String(parsed.data.amount),
    paymentMethod: parsed.data.paymentMethod,
    note: parsed.data.note ?? null,
  });

  const [updated] = await db
    .update(salesTable)
    .set({
      amountPaid: String(newPaid),
      amountDue: String(due),
      paymentStatus: status,
    })
    .where(eq(salesTable.id, sale.id))
    .returning();

  const [customer] = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.id, sale.customerId));
  const [bike] = await db
    .select()
    .from(bikesTable)
    .where(eq(bikesTable.id, sale.bikeId));
  res.json(serializeSale(updated, customer, bike));
});

export default router;
