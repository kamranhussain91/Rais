import * as fs from "node:fs";
import { sql } from "drizzle-orm";
import {
  db,
  bikesTable,
  customersTable,
  paymentsTable,
  salesTable,
  usersTable,
} from "@workspace/db";
import { hashPassword } from "../../artifacts/api-server/src/lib/auth";

const BACKUP = process.env.BACKUP_FILE ?? "/tmp/dbbackup/my_db_backup.sql";

type Row = Record<string, string | null>;

function parseInserts(sqlText: string, table: string): Row[] {
  const re = new RegExp(
    `INSERT INTO \\\`${table}\\\` \\(([^)]+)\\) VALUES \\((.*?)\\);`,
    "g",
  );
  const rows: Row[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(sqlText))) {
    const cols = m[1].split(",").map((c) => c.trim().replace(/`/g, ""));
    const vals = parseValues(m[2]);
    if (cols.length !== vals.length) continue;
    const obj: Row = {};
    for (let i = 0; i < cols.length; i++) obj[cols[i]] = vals[i];
    rows.push(obj);
  }
  return rows;
}

function parseValues(s: string): (string | null)[] {
  const out: (string | null)[] = [];
  let i = 0;
  while (i < s.length) {
    while (i < s.length && (s[i] === " " || s[i] === "\t")) i++;
    if (s[i] === "'") {
      i++;
      let v = "";
      while (i < s.length) {
        if (s[i] === "\\" && i + 1 < s.length) {
          const next = s[i + 1];
          if (next === "n") v += "\n";
          else if (next === "t") v += "\t";
          else if (next === "r") v += "\r";
          else v += next;
          i += 2;
        } else if (s[i] === "'") {
          if (s[i + 1] === "'") {
            v += "'";
            i += 2;
          } else {
            i++;
            break;
          }
        } else {
          v += s[i];
          i++;
        }
      }
      out.push(v);
    } else {
      let v = "";
      while (i < s.length && s[i] !== ",") {
        v += s[i];
        i++;
      }
      const t = v.trim();
      out.push(t === "NULL" || t === "" ? null : t);
    }
    while (i < s.length && s[i] !== ",") i++;
    if (s[i] === ",") i++;
  }
  return out;
}

function deriveBrandCategory(productName: string): {
  brand: string;
  model: string;
  category: string;
  color: string;
  engineCc: number | null;
} {
  const upper = productName.trim().toUpperCase();
  let brand = "Honda";
  if (upper.includes("CD") || upper.includes("CG") || upper.includes("CB") || upper.includes("PRIDOR") || upper.includes("DREAM"))
    brand = "Honda";
  else if (upper.includes("GS") || upper.includes("SUZUKI")) brand = "Suzuki";
  else if (upper.includes("YBR") || upper.includes("YAMAHA")) brand = "Yamaha";

  const cc =
    upper.match(/(\d{2,3})\s*(?:CC)?/)?.[1] ??
    (upper.includes("CD70") ? "70" : null);
  const engineCc = cc ? parseInt(cc, 10) : null;

  const colors = [
    ["RED", "Red"],
    ["BLK", "Black"],
    ["BLACK", "Black"],
    ["BLUE", "Blue"],
    ["WHITE", "White"],
    ["SILVER", "Silver"],
    ["GOLD", "Gold"],
    ["GREEN", "Green"],
  ];
  let color = "";
  for (const [needle, label] of colors) {
    if (upper.includes(needle)) {
      color = label;
      break;
    }
  }
  if (upper.includes("2 TONE")) color = "Two-Tone";

  // Strip color words from name to get model
  let model = productName.trim();
  for (const [needle] of colors) {
    model = model.replace(new RegExp(`\\b${needle}\\b`, "ig"), "").trim();
  }
  model = model.replace(/\s{2,}/g, " ").trim();

  let category = "Commuter";
  if (engineCc && engineCc >= 150) category = "Sport";
  else if (engineCc && engineCc >= 125) category = "Standard";

  return { brand, model: model || productName, category, color, engineCc };
}

async function main() {
  // eslint-disable-next-line no-console
  console.log("Importing backup from", BACKUP);
  if (!fs.existsSync(BACKUP)) throw new Error("Backup file not found");
  const text = fs.readFileSync(BACKUP, "utf8");

  // eslint-disable-next-line no-console
  console.log("Parsing tables...");
  const customers = parseInserts(text, "tbl_customer");
  const products = parseInserts(text, "tbl_product");
  const cashSales = parseInserts(text, "tbl_salecash");
  const installSales = parseInserts(text, "tbl_saleinstall");
  // eslint-disable-next-line no-console
  console.log({
    customers: customers.length,
    products: products.length,
    cashSales: cashSales.length,
    installSales: installSales.length,
  });

  // Reset
  // eslint-disable-next-line no-console
  console.log("Resetting database...");
  await db.delete(paymentsTable);
  await db.delete(salesTable);
  await db.delete(bikesTable);
  await db.delete(customersTable);
  await db.delete(usersTable);
  await db.execute(sql`ALTER SEQUENCE bikes_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE customers_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE sales_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE payments_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE users_id_seq RESTART WITH 1`);

  // Admin
  await db.insert(usersTable).values({
    username: "admin",
    passwordHash: hashPassword("admin123"),
    fullName: "Rais",
    role: "owner",
  });

  // Customer ID mapping (cus_id from backup → new id)
  const customerIdMap = new Map<number, number>();
  // eslint-disable-next-line no-console
  console.log("Importing customers...");
  const CUST_BATCH = 500;
  for (let i = 0; i < customers.length; i += CUST_BATCH) {
    const batch = customers.slice(i, i + CUST_BATCH);
    const inserted = await db
      .insert(customersTable)
      .values(
        batch.map((c) => ({
          fullName: (c.name ?? "Unknown").trim() || "Unknown",
          phone: (c.phone ?? "").trim() || "—",
          email: null,
          address: (c.address ?? "").trim() || null,
          cnic: (c.cnic ?? "").trim() || null,
          notes: c.khatanum ? `Khata No: ${c.khatanum}` : null,
        })),
      )
      .returning({ id: customersTable.id });
    for (let j = 0; j < batch.length; j++) {
      customerIdMap.set(parseInt(batch[j].cus_id ?? "0", 10), inserted[j].id);
    }
  }

  // Compute prices per product from cash sales
  // eslint-disable-next-line no-console
  console.log("Computing average prices from sales...");
  type Stat = { saleSum: number; saleCnt: number; costSum: number; costCnt: number };
  const stats = new Map<number, Stat>();
  for (const s of cashSales) {
    const pid = parseInt(s.model ?? "0", 10);
    if (!pid) continue;
    const price = parseFloat(s.price ?? "0");
    const cost = parseFloat(s.company_price ?? "0");
    const stat = stats.get(pid) ?? { saleSum: 0, saleCnt: 0, costSum: 0, costCnt: 0 };
    if (price > 0) {
      stat.saleSum += price;
      stat.saleCnt++;
    }
    if (cost > 0) {
      stat.costSum += cost;
      stat.costCnt++;
    }
    stats.set(pid, stat);
  }

  // Bike ID mapping
  const bikeIdMap = new Map<number, number>();
  // eslint-disable-next-line no-console
  console.log("Importing bikes...");
  for (const p of products) {
    const pid = parseInt(p.product_id ?? "0", 10);
    const name = (p.product_name ?? "").trim();
    if (!pid || !name) continue;
    const meta = deriveBrandCategory(name);
    const stat = stats.get(pid);
    const salePrice = stat && stat.saleCnt ? Math.round(stat.saleSum / stat.saleCnt) : 150000;
    const purchasePrice = stat && stat.costCnt ? Math.round(stat.costSum / stat.costCnt) : Math.round(salePrice * 0.92);
    const stock = Math.max(0, parseInt(p.qntity ?? "0", 10));
    const sku = `RM-${String(pid).padStart(4, "0")}`;
    const [bike] = await db
      .insert(bikesTable)
      .values({
        name,
        brand: meta.brand,
        model: meta.model,
        category: meta.category,
        color: meta.color,
        engineCc: meta.engineCc,
        purchasePrice: String(purchasePrice),
        salePrice: String(salePrice),
        stock,
        lowStockThreshold: 2,
        sku,
        notes: `Imported from legacy system (product_id=${pid})`,
      })
      .returning({ id: bikesTable.id });
    bikeIdMap.set(pid, bike.id);
  }

  // Import cash sales
  // eslint-disable-next-line no-console
  console.log("Importing cash sales...");
  const SALE_BATCH = 500;
  let salesImported = 0;
  let salesSkipped = 0;

  type SaleInsert = typeof salesTable.$inferInsert;
  type PaymentInsert = typeof paymentsTable.$inferInsert;

  for (let offset = 0; offset < cashSales.length; offset += SALE_BATCH) {
    const slice = cashSales.slice(offset, offset + SALE_BATCH);
    const saleRows: SaleInsert[] = [];
    const paymentRows: PaymentInsert[] = [];

    for (const s of slice) {
      const cusId = parseInt(s.cus_name ?? "0", 10);
      const prodId = parseInt(s.model ?? "0", 10);
      const customerId = customerIdMap.get(cusId);
      const bikeId = bikeIdMap.get(prodId);
      if (!customerId || !bikeId) {
        salesSkipped++;
        continue;
      }
      const price = parseFloat(s.price ?? "0");
      const after = parseFloat(s.after_dis_pay ?? "0");
      const discount = Math.max(0, price - after);
      const total = after > 0 ? after : price;
      let createdAt = new Date();
      if (s.sale_date) {
        const d = new Date(s.sale_date);
        if (!isNaN(d.getTime())) createdAt = d;
      }
      const invoiceNo = `RM-${createdAt.getFullYear()}-${String(s.saleinfo_id).padStart(5, "0")}`;
      saleRows.push({
        invoiceNo,
        customerId,
        bikeId,
        quantity: 1,
        unitPrice: String(price > 0 ? price : total),
        discount: String(discount),
        totalAmount: String(total),
        amountPaid: String(total),
        amountDue: "0",
        paymentMethod: "cash",
        paymentStatus: "paid",
        notes: s.bikebook_no ? `Bike Book: ${s.bikebook_no}` : null,
        createdAt,
      });
    }

    if (saleRows.length === 0) continue;
    const inserted = await db
      .insert(salesTable)
      .values(saleRows)
      .returning({ id: salesTable.id, totalAmount: salesTable.totalAmount, createdAt: salesTable.createdAt });
    for (let j = 0; j < inserted.length; j++) {
      paymentRows.push({
        saleId: inserted[j].id,
        amount: inserted[j].totalAmount,
        paymentMethod: "cash",
        note: "Imported (full payment)",
        createdAt: inserted[j].createdAt,
      });
    }
    if (paymentRows.length) await db.insert(paymentsTable).values(paymentRows);
    salesImported += inserted.length;
  }

  // Import installment sales as partial-payment sales (where down payment was made)
  // eslint-disable-next-line no-console
  console.log("Importing installment sales as outstanding sales...");
  let installImported = 0;
  for (let offset = 0; offset < installSales.length; offset += SALE_BATCH) {
    const slice = installSales.slice(offset, offset + SALE_BATCH);
    const saleRows: SaleInsert[] = [];
    for (const s of slice) {
      const cusId = parseInt(s.cus_name ?? "0", 10);
      const prodId = parseInt(s.model ?? "0", 10);
      const customerId = customerIdMap.get(cusId);
      const bikeId = bikeIdMap.get(prodId);
      if (!customerId || !bikeId) continue;
      const price = parseFloat(s.price ?? "0");
      const after = parseFloat(s.after_dis_pay ?? "0");
      const downPay = parseFloat(s.down_pay ?? "0");
      const discount = Math.max(0, price - after);
      const total = after > 0 ? after : price;
      const paid = Math.min(total, downPay);
      const due = Math.max(0, total - paid);
      const status = due <= 0.01 ? "paid" : paid > 0 ? "partial" : "unpaid";
      let createdAt = new Date();
      if (s.sale_date) {
        const d = new Date(s.sale_date);
        if (!isNaN(d.getTime())) createdAt = d;
      }
      const invoiceNo = `RM-INST-${createdAt.getFullYear()}-${String(s.saleinfo_id).padStart(5, "0")}`;
      saleRows.push({
        invoiceNo,
        customerId,
        bikeId,
        quantity: 1,
        unitPrice: String(price > 0 ? price : total),
        discount: String(discount),
        totalAmount: String(total),
        amountPaid: String(paid),
        amountDue: String(due),
        paymentMethod: "installment",
        paymentStatus: status,
        notes: "Installment sale (imported)",
        createdAt,
      });
    }
    if (saleRows.length === 0) continue;
    const inserted = await db
      .insert(salesTable)
      .values(saleRows)
      .returning({ id: salesTable.id });
    installImported += inserted.length;
  }

  // eslint-disable-next-line no-console
  console.log({ salesImported, installImported, salesSkipped });
  // eslint-disable-next-line no-console
  console.log("Import complete.");
  process.exit(0);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
