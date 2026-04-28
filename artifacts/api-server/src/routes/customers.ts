import { Router, type IRouter } from "express";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import {
  db,
  bikesTable,
  customersTable,
  salesTable,
} from "@workspace/db";
import {
  CreateCustomerBody,
  UpdateCustomerBody,
  ListCustomersQueryParams,
  GetCustomerParams,
  UpdateCustomerParams,
  DeleteCustomerParams,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { serializeCustomer, serializeSale } from "../lib/serialize";

const router: IRouter = Router();
router.use(requireAuth());

router.get("/customers", async (req, res): Promise<void> => {
  const q = ListCustomersQueryParams.safeParse(req.query);
  if (!q.success) {
    res.status(400).json({ error: q.error.message });
    return;
  }
  const { search } = q.data;
  const filters = [];
  if (search) {
    filters.push(
      or(
        ilike(customersTable.fullName, `%${search}%`),
        ilike(customersTable.phone, `%${search}%`),
      ),
    );
  }
  const rows = await db
    .select()
    .from(customersTable)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(customersTable.id))
    .limit(search ? 500 : 200);
  res.json(rows.map(serializeCustomer));
});

router.post("/customers", async (req, res): Promise<void> => {
  const parsed = CreateCustomerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;
  const [c] = await db
    .insert(customersTable)
    .values({
      fullName: data.fullName,
      phone: data.phone,
      email: data.email ?? null,
      address: data.address ?? null,
      cnic: data.cnic ?? null,
      notes: data.notes ?? null,
    })
    .returning();
  res.json(serializeCustomer(c));
});

router.get("/customers/:id", async (req, res): Promise<void> => {
  const p = GetCustomerParams.safeParse(req.params);
  if (!p.success) {
    res.status(400).json({ error: p.error.message });
    return;
  }
  const [customer] = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.id, p.data.id));
  if (!customer) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }
  const rows = await db
    .select({ sale: salesTable, bike: bikesTable })
    .from(salesTable)
    .innerJoin(bikesTable, eq(bikesTable.id, salesTable.bikeId))
    .where(eq(salesTable.customerId, customer.id))
    .orderBy(desc(salesTable.createdAt));

  const sales = rows.map((r) => serializeSale(r.sale, customer, r.bike));
  const totalSpent = sales.reduce((s, x) => s + x.amountPaid, 0);
  const totalDue = sales.reduce((s, x) => s + x.amountDue, 0);
  res.json({
    ...serializeCustomer(customer),
    sales,
    totalSpent,
    totalDue,
  });
});

router.patch("/customers/:id", async (req, res): Promise<void> => {
  const p = UpdateCustomerParams.safeParse(req.params);
  if (!p.success) {
    res.status(400).json({ error: p.error.message });
    return;
  }
  const parsed = UpdateCustomerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;
  const [c] = await db
    .update(customersTable)
    .set({
      fullName: data.fullName,
      phone: data.phone,
      email: data.email ?? null,
      address: data.address ?? null,
      cnic: data.cnic ?? null,
      notes: data.notes ?? null,
    })
    .where(eq(customersTable.id, p.data.id))
    .returning();
  if (!c) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }
  res.json(serializeCustomer(c));
});

router.delete("/customers/:id", async (req, res): Promise<void> => {
  const p = DeleteCustomerParams.safeParse(req.params);
  if (!p.success) {
    res.status(400).json({ error: p.error.message });
    return;
  }
  const [c] = await db
    .delete(customersTable)
    .where(eq(customersTable.id, p.data.id))
    .returning();
  if (!c) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }
  res.json({ success: true });
});

export default router;
