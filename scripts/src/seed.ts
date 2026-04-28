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

async function main() {
  // eslint-disable-next-line no-console
  console.log("Seeding Rais Motors database...");

  // Reset
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

  await db.insert(usersTable).values([
    {
      username: "admin",
      passwordHash: hashPassword("admin123"),
      fullName: "Showroom Owner",
      role: "owner",
    },
  ]);

  const bikes = await db
    .insert(bikesTable)
    .values([
      {
        name: "Honda CD 70",
        brand: "Honda",
        model: "CD 70",
        category: "Commuter",
        color: "Red",
        engineCc: 70,
        purchasePrice: "135000",
        salePrice: "152000",
        stock: 12,
        lowStockThreshold: 3,
        sku: "HND-CD70-RD",
        imageUrl: null,
        notes: "Most popular commuter",
      },
      {
        name: "Honda CG 125",
        brand: "Honda",
        model: "CG 125",
        category: "Standard",
        color: "Black",
        engineCc: 125,
        purchasePrice: "240000",
        salePrice: "265000",
        stock: 8,
        lowStockThreshold: 2,
        sku: "HND-CG125-BK",
      },
      {
        name: "Suzuki GS 150",
        brand: "Suzuki",
        model: "GS 150",
        category: "Sport",
        color: "Blue",
        engineCc: 150,
        purchasePrice: "315000",
        salePrice: "345000",
        stock: 4,
        lowStockThreshold: 2,
        sku: "SZK-GS150-BL",
      },
      {
        name: "Yamaha YBR 125",
        brand: "Yamaha",
        model: "YBR 125",
        category: "Sport",
        color: "Black",
        engineCc: 125,
        purchasePrice: "295000",
        salePrice: "325000",
        stock: 2,
        lowStockThreshold: 3,
        sku: "YMH-YBR125-BK",
      },
      {
        name: "Road Prince Wego",
        brand: "Road Prince",
        model: "Wego 125",
        category: "Standard",
        color: "Red",
        engineCc: 125,
        purchasePrice: "165000",
        salePrice: "185000",
        stock: 0,
        lowStockThreshold: 2,
        sku: "RP-WEGO-RD",
      },
      {
        name: "Honda Pridor",
        brand: "Honda",
        model: "Pridor 100",
        category: "Commuter",
        color: "Maroon",
        engineCc: 100,
        purchasePrice: "168000",
        salePrice: "188000",
        stock: 6,
        lowStockThreshold: 2,
        sku: "HND-PRD-MR",
      },
    ])
    .returning();

  const customers = await db
    .insert(customersTable)
    .values([
      {
        fullName: "Ali Hassan",
        phone: "+92 300 1234567",
        email: "ali.hassan@example.com",
        address: "House 12, Street 5, F-8 Islamabad",
        cnic: "61101-1234567-1",
      },
      {
        fullName: "Bilal Ahmed",
        phone: "+92 321 9876543",
        email: "bilal@example.com",
        address: "Plot 4, Gulberg, Lahore",
        cnic: "35202-7654321-3",
      },
      {
        fullName: "Sana Khan",
        phone: "+92 333 5556677",
        address: "DHA Phase 6, Karachi",
        cnic: "42201-1112233-5",
      },
      {
        fullName: "Usman Tariq",
        phone: "+92 345 1112233",
        address: "Saddar, Rawalpindi",
      },
      {
        fullName: "Hira Sheikh",
        phone: "+92 312 4445566",
        email: "hira.sheikh@example.com",
      },
    ])
    .returning();

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  type SeedSale = {
    customerIdx: number;
    bikeIdx: number;
    quantity: number;
    discount: number;
    amountPaid: number;
    paymentMethod: string;
    daysAgo: number;
    notes?: string;
  };

  const seedSales: SeedSale[] = [
    { customerIdx: 0, bikeIdx: 0, quantity: 1, discount: 2000, amountPaid: 150000, paymentMethod: "cash", daysAgo: 1 },
    { customerIdx: 1, bikeIdx: 1, quantity: 1, discount: 0, amountPaid: 265000, paymentMethod: "bank_transfer", daysAgo: 3 },
    { customerIdx: 2, bikeIdx: 2, quantity: 1, discount: 5000, amountPaid: 200000, paymentMethod: "cash", daysAgo: 5, notes: "Partial — balance due in 2 weeks" },
    { customerIdx: 3, bikeIdx: 3, quantity: 1, discount: 0, amountPaid: 325000, paymentMethod: "card", daysAgo: 12 },
    { customerIdx: 4, bikeIdx: 5, quantity: 1, discount: 3000, amountPaid: 0, paymentMethod: "cash", daysAgo: 20, notes: "Reserved — payment pending" },
    { customerIdx: 0, bikeIdx: 1, quantity: 1, discount: 0, amountPaid: 100000, paymentMethod: "cash", daysAgo: 35 },
    { customerIdx: 1, bikeIdx: 0, quantity: 2, discount: 5000, amountPaid: 299000, paymentMethod: "bank_transfer", daysAgo: 60 },
    { customerIdx: 2, bikeIdx: 0, quantity: 1, discount: 0, amountPaid: 152000, paymentMethod: "cash", daysAgo: 95 },
    { customerIdx: 3, bikeIdx: 5, quantity: 1, discount: 0, amountPaid: 188000, paymentMethod: "card", daysAgo: 130 },
    { customerIdx: 4, bikeIdx: 1, quantity: 1, discount: 0, amountPaid: 265000, paymentMethod: "cash", daysAgo: 170 },
    { customerIdx: 0, bikeIdx: 2, quantity: 1, discount: 0, amountPaid: 345000, paymentMethod: "bank_transfer", daysAgo: 210 },
    { customerIdx: 1, bikeIdx: 0, quantity: 1, discount: 0, amountPaid: 152000, paymentMethod: "cash", daysAgo: 250 },
  ];

  for (let i = 0; i < seedSales.length; i++) {
    const s = seedSales[i];
    const bike = bikes[s.bikeIdx];
    const customer = customers[s.customerIdx];
    const unitPrice = Number(bike.salePrice);
    const subtotal = unitPrice * s.quantity;
    const total = Math.max(0, subtotal - s.discount);
    const due = Math.max(0, total - s.amountPaid);
    const status = s.amountPaid >= total - 0.01 ? "paid" : s.amountPaid > 0 ? "partial" : "unpaid";
    const createdAt = new Date(now - s.daysAgo * day);
    const invoiceNo = `RM-${createdAt.getFullYear()}-${String(i + 1).padStart(5, "0")}`;

    const [sale] = await db
      .insert(salesTable)
      .values({
        invoiceNo,
        customerId: customer.id,
        bikeId: bike.id,
        quantity: s.quantity,
        unitPrice: String(unitPrice),
        discount: String(s.discount),
        totalAmount: String(total),
        amountPaid: String(s.amountPaid),
        amountDue: String(due),
        paymentMethod: s.paymentMethod,
        paymentStatus: status,
        notes: s.notes ?? null,
        createdAt,
      })
      .returning();

    if (s.amountPaid > 0) {
      await db.insert(paymentsTable).values({
        saleId: sale.id,
        amount: String(s.amountPaid),
        paymentMethod: s.paymentMethod,
        note: "Initial payment",
        createdAt,
      });
    }
  }

  // eslint-disable-next-line no-console
  console.log("Seed complete.");
  process.exit(0);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
