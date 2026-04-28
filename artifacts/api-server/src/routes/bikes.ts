import { Router, type IRouter } from "express";
import { and, eq, ilike, or } from "drizzle-orm";
import { db, bikesTable } from "@workspace/db";
import {
  CreateBikeBody,
  UpdateBikeBody,
  ListBikesQueryParams,
  GetBikeParams,
  UpdateBikeParams,
  DeleteBikeParams,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { serializeBike } from "../lib/serialize";

const router: IRouter = Router();
router.use(requireAuth());

router.get("/bikes", async (req, res): Promise<void> => {
  const q = ListBikesQueryParams.safeParse(req.query);
  if (!q.success) {
    res.status(400).json({ error: q.error.message });
    return;
  }
  const { search, status } = q.data;
  const filters = [];
  if (search) {
    filters.push(
      or(
        ilike(bikesTable.name, `%${search}%`),
        ilike(bikesTable.brand, `%${search}%`),
        ilike(bikesTable.model, `%${search}%`),
        ilike(bikesTable.sku, `%${search}%`),
      ),
    );
  }
  const rows = await db
    .select()
    .from(bikesTable)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(bikesTable.id);

  let result = rows;
  if (status) {
    result = rows.filter((b) => {
      const stockStatus =
        b.stock <= 0
          ? "out_of_stock"
          : b.stock <= b.lowStockThreshold
            ? "low_stock"
            : "in_stock";
      return stockStatus === status;
    });
  }
  res.json(result.map(serializeBike));
});

router.post("/bikes", async (req, res): Promise<void> => {
  const parsed = CreateBikeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;
  const [bike] = await db
    .insert(bikesTable)
    .values({
      name: data.name,
      brand: data.brand,
      model: data.model,
      category: data.category,
      color: data.color ?? "",
      engineCc: data.engineCc ?? null,
      purchasePrice: String(data.purchasePrice ?? 0),
      salePrice: String(data.salePrice),
      stock: data.stock,
      lowStockThreshold: data.lowStockThreshold ?? 2,
      sku: data.sku,
      imageUrl: data.imageUrl ?? null,
      notes: data.notes ?? null,
    })
    .returning();
  res.json(serializeBike(bike));
});

router.get("/bikes/:id", async (req, res): Promise<void> => {
  const p = GetBikeParams.safeParse(req.params);
  if (!p.success) {
    res.status(400).json({ error: p.error.message });
    return;
  }
  const [bike] = await db
    .select()
    .from(bikesTable)
    .where(eq(bikesTable.id, p.data.id));
  if (!bike) {
    res.status(404).json({ error: "Bike not found" });
    return;
  }
  res.json(serializeBike(bike));
});

router.patch("/bikes/:id", async (req, res): Promise<void> => {
  const p = UpdateBikeParams.safeParse(req.params);
  if (!p.success) {
    res.status(400).json({ error: p.error.message });
    return;
  }
  const parsed = UpdateBikeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;
  const [bike] = await db
    .update(bikesTable)
    .set({
      name: data.name,
      brand: data.brand,
      model: data.model,
      category: data.category,
      color: data.color ?? "",
      engineCc: data.engineCc ?? null,
      purchasePrice: String(data.purchasePrice ?? 0),
      salePrice: String(data.salePrice),
      stock: data.stock,
      lowStockThreshold: data.lowStockThreshold ?? 2,
      sku: data.sku,
      imageUrl: data.imageUrl ?? null,
      notes: data.notes ?? null,
    })
    .where(eq(bikesTable.id, p.data.id))
    .returning();
  if (!bike) {
    res.status(404).json({ error: "Bike not found" });
    return;
  }
  res.json(serializeBike(bike));
});

router.delete("/bikes/:id", async (req, res): Promise<void> => {
  const p = DeleteBikeParams.safeParse(req.params);
  if (!p.success) {
    res.status(400).json({ error: p.error.message });
    return;
  }
  const [bike] = await db
    .delete(bikesTable)
    .where(eq(bikesTable.id, p.data.id))
    .returning();
  if (!bike) {
    res.status(404).json({ error: "Bike not found" });
    return;
  }
  res.json({ success: true });
});

export default router;
