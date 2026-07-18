import { Router, type IRouter } from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import QRCode from "qrcode";
import { logger } from "../lib/logger";
import type {
  Product,
  SaleInvoice,
  SaleItem,
  PurchaseRecord,
  ServiceRecord,
  Expense,
  BankLedgerEntry,
  Customer,
  ActivityLog,
  BackupHistory,
  AppDatabase,
  User,
} from "../honda-types";

const router: IRouter = Router();

// ─── Data directory setup ───────────────────────────────────────────────────
const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");
const BACKUPS_DIR = path.join(DATA_DIR, "backups");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });

// ─── Seed data ───────────────────────────────────────────────────────────────
const DEFAULT_DATABASE: AppDatabase = {
  users: [
    { id: "1", username: "admin", role: "Super Admin", name: "System Administrator", password: "admin", status: "Active", lastLogin: "2026-06-02T09:00:00.000Z" },
    { id: "2", username: "manager", role: "Manager", name: "Store Manager", password: "manager", status: "Active", lastLogin: "2026-06-02T08:45:00.000Z" },
    { id: "3", username: "cashier1", role: "Cashier", name: "Cashier One", password: "cashier", status: "Active", lastLogin: "2026-06-02T08:30:00.000Z" },
    { id: "4", username: "storekeeper", role: "Store Keeper", name: "Store Keeper", password: "keeper", status: "Active", lastLogin: "2026-06-02T08:15:00.000Z" },
  ],
  products: [
    { id: "prod_1", name: "Honda Genuine Spark Plug (NGK)", partNumber: "98056-10100", barcode: "9805610100", category: "Electrical", compatibility: "CD-70, CD-70 Dream, Pridor", purchasePrice: 180, sellingPrice: 250, stock: 45, minStock: 10, supplierName: "Honda Atlas Parts Ltd", location: "Rack A, Shelf 2" },
    { id: "prod_2", name: "Honda Genuine Engine Oil 4T 20W-50 (1L)", partNumber: "08C35-20W50", barcode: "08C3520W50", category: "Lubricants", compatibility: "CG-125, CG-125 Self, CB-150F", purchasePrice: 920, sellingPrice: 1100, stock: 35, minStock: 8, supplierName: "Honda Atlas Parts Ltd", location: "Pallet B, Floor" },
    { id: "prod_3", name: "Front Brake Shoe Set", partNumber: "43125-086-030", barcode: "43125086030", category: "Brakes", compatibility: "CD-70, CG-125", purchasePrice: 320, sellingPrice: 450, stock: 6, minStock: 10, supplierName: "Allied Auto Distributors", location: "Rack B, Shelf 1" },
    { id: "prod_4", name: "CG-125 Genuine Air Filter Element", partNumber: "17211-397-000", barcode: "17211397000", category: "Filters", compatibility: "CG-125, CG-125 Self", purchasePrice: 400, sellingPrice: 550, stock: 22, minStock: 5, supplierName: "Honda Atlas Parts Ltd", location: "Rack A, Shelf 3" },
    { id: "prod_5", name: "CD-70 Chain Sprocket Kit", partNumber: "40530-KCC-900", barcode: "40530KCC900", category: "Transmission", compatibility: "CD-70", purchasePrice: 1450, sellingPrice: 1950, stock: 9, minStock: 4, supplierName: "Zahid Auto Traders", location: "Rack C, Shelf 1" },
  ],
  invoices: [
    { id: "inv_1", invoiceNumber: "INV-2026-0001", date: "2026-05-28T10:15:00.000Z", customerId: "cust_1", customerName: "Muhammad Salman", customerPhone: "03001234567", customerAddress: "Gulberg III, Lahore", customerBikeModel: "CG-125", items: [{ productId: "prod_2", name: "Honda Genuine Engine Oil 4T 20W-50 (1L)", partNumber: "08C35-20W50", qty: 1, purchasePrice: 920, sellingPrice: 1100 }, { productId: "prod_4", name: "CG-125 Genuine Air Filter Element", partNumber: "17211-397-000", qty: 1, purchasePrice: 400, sellingPrice: 550 }], subtotal: 1650, discount: 50, finalAmount: 1600, paymentMethod: "Cash", profit: 280 },
    { id: "inv_2", invoiceNumber: "INV-2026-0002", date: "2026-05-30T15:30:00.000Z", customerId: "cust_2", customerName: "Sajid Mehmood", customerPhone: "03129876543", customerAddress: "DHA Phase 5, Lahore", customerBikeModel: "CD-70", items: [{ productId: "prod_1", name: "Honda Genuine Spark Plug (NGK)", partNumber: "98056-10100", qty: 1, purchasePrice: 180, sellingPrice: 250 }, { productId: "prod_5", name: "CD-70 Chain Sprocket Kit", partNumber: "40530-KCC-900", qty: 1, purchasePrice: 1450, sellingPrice: 1950 }], subtotal: 2200, discount: 100, finalAmount: 2100, paymentMethod: "Bank Transfer", bankAccountId: "bank_2", profit: 470 },
    { id: "inv_3", invoiceNumber: "INV-2026-0601-01", date: "2026-06-01T09:30:00.000Z", customerId: "cust_1", customerName: "Muhammad Salman", customerPhone: "03001234567", items: [{ productId: "prod_2", name: "Honda Genuine Engine Oil 4T 20W-50 (1L)", partNumber: "08C35-20W50", qty: 1, purchasePrice: 920, sellingPrice: 1100 }], subtotal: 1100, discount: 0, finalAmount: 1100, paymentMethod: "Cash", profit: 180 },
  ],
  purchases: [
    { id: "pur_1", invoiceRef: "HONDA-77192", date: "2026-05-20T11:00:00.000Z", supplierName: "Honda Atlas Parts Ltd", items: [{ productId: "prod_1", name: "Honda Genuine Spark Plug (NGK)", partNumber: "98056-10100", purchasePrice: 180, qty: 50 }, { productId: "prod_2", name: "Honda Genuine Engine Oil 4T 20W-50 (1L)", partNumber: "08C35-20W50", purchasePrice: 920, qty: 40 }], totalAmount: 45800, amountPaid: 45800, paymentMethod: "Bank Transfer", bankAccountId: "bank_1", status: "received" },
  ],
  services: [
    { id: "ser_1", invoiceNumber: "SRV-2026-0001", customerName: "Kashif Ali", customerPhone: "03457654321", bikeModel: "CD-70", serviceType: "Oil Change", price: 150, date: "2026-05-01T12:00:00.000Z", nextReminderDate: "2026-05-31T12:00:00.000Z", reminderStatus: "Sent", notes: "Oil changed. Recommended tuning next visit." },
    { id: "ser_2", invoiceNumber: "SRV-2026-0002", customerName: "Muhammad Salman", customerPhone: "03001234567", bikeModel: "CG-125", serviceType: "Bike Tuning", price: 800, date: "2026-05-28T10:15:00.000Z", notes: "Tappet adjustment and carburetor cleaning." },
    { id: "ser_3", invoiceNumber: "SRV-2026-0003", customerName: "Siddique Shah", customerPhone: "03334543210", bikeModel: "Pridor", serviceType: "Oil Change", price: 150, date: "2026-06-01T08:30:00.000Z", nextReminderDate: "2026-07-01T08:30:00.000Z", reminderStatus: "Pending", notes: "Honda 4T oil poured." },
    { id: "ser_4", invoiceNumber: "SRV-2026-0004", customerName: "Yasir Khan", customerPhone: "03215556677", bikeModel: "CB-150F", serviceType: "Oil Change", price: 200, date: "2026-04-30T14:00:00.000Z", nextReminderDate: "2026-05-30T14:00:00.000Z", reminderStatus: "Pending", notes: "Regular engine oil top up." },
  ],
  expenses: [
    { id: "exp_1", date: "2026-05-25T18:00:00.000Z", category: "Electricity", amount: 4500, description: "May Electricity Bill" },
    { id: "exp_2", date: "2026-05-01T09:00:00.000Z", category: "Rent", amount: 25000, description: "Monthly rent for May" },
    { id: "exp_3", date: "2026-06-01T11:00:00.000Z", category: "Miscellaneous", amount: 450, description: "Teas & Refreshments for workshop guests" },
  ],
  accounts: [
    { id: "bank_1", bankName: "Meezan Bank Shariah", accountNumber: "2014-030214-01", balance: 135000 },
    { id: "bank_2", bankName: "Bank Alfalah POS", accountNumber: "5566-100234-88", balance: 74500 },
    { id: "cash_chest", bankName: "Cash-in-Hand Drawer", accountNumber: "CASH-PRIMARY", balance: 24700 },
  ],
  ledger: [
    { id: "led_1", bankAccountId: "bank_1", bankName: "Meezan Bank Shariah", date: "2026-05-20T11:05:00.000Z", type: "Debit", amount: 45800, description: "Paid supplier invoice HONDA-77192", balanceAfter: 135000, referenceId: "pur_1" },
    { id: "led_2", bankAccountId: "bank_2", bankName: "Bank Alfalah POS", date: "2026-05-30T15:30:00.000Z", type: "Credit", amount: 2100, description: "Sale Invoice INV-2026-0002 bank deposit", balanceAfter: 74500, referenceId: "inv_2" },
    { id: "led_3", bankAccountId: "cash_chest", bankName: "Cash-in-Hand Drawer", date: "2026-06-01T09:30:00.000Z", type: "Credit", amount: 1100, description: "Cash sale from Invoice INV-2026-0601-01", balanceAfter: 24700, referenceId: "inv_3" },
  ],
  customers: [
    { id: "cust_1", name: "Muhammad Salman", phone: "03001234567", address: "Gulberg III, Lahore", bikeModel: "CG-125" },
    { id: "cust_2", name: "Sajid Mehmood", phone: "03129876543", address: "DHA Phase 5, Lahore", bikeModel: "CD-70" },
    { id: "cust_3", name: "Kashif Ali", phone: "03457654321", address: "Model Town, Lahore", bikeModel: "CD-70" },
  ],
  suppliers: [
    { id: "sup_1", name: "Honda Atlas Parts Ltd", phone: "042111444777", address: "Queens Road, Lahore", balance: 15600 },
    { id: "sup_2", name: "Allied Auto Distributors", phone: "03214445556", address: "McLeod Road, Lahore", balance: 0 },
    { id: "sup_3", name: "Zahid Auto Traders", phone: "03004455667", address: "Lytton Road, Lahore", balance: 8500 },
  ],
  activityLogs: [
    { id: "log_1", userId: "1", username: "admin", action: "Seeded system default database", timestamp: "2026-06-01T12:00:00.000Z" },
  ],
  backups: [],
  fbrSyncQueue: [],
  terminalSyncLogs: [],
  analyticsCache: { lastUpdated: new Date(0).toISOString(), preAggregated: null },
};

// ─── DB helpers ──────────────────────────────────────────────────────────────
function readDB(): AppDatabase {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DATABASE, null, 2));
      return JSON.parse(JSON.stringify(DEFAULT_DATABASE));
    }
    const data = fs.readFileSync(DB_FILE, "utf8");
    const dbObj: AppDatabase = JSON.parse(data);
    if (!dbObj.fbrSyncQueue) dbObj.fbrSyncQueue = [];
    if (!dbObj.terminalSyncLogs) dbObj.terminalSyncLogs = [];
    if (!dbObj.analyticsCache) dbObj.analyticsCache = { lastUpdated: new Date(0).toISOString(), preAggregated: null };
    if (!dbObj.users || dbObj.users.length === 0) dbObj.users = [...DEFAULT_DATABASE.users];
    return dbObj;
  } catch (err) {
    logger.error({ err }, "Error reading database file");
    return JSON.parse(JSON.stringify(DEFAULT_DATABASE));
  }
}

function writeDB(db: AppDatabase) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch (err) {
    logger.error({ err }, "Error writing database file");
  }
}

function logActivity(userId: string, username: string, action: string) {
  const db = readDB();
  const log: ActivityLog = {
    id: "log_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    userId,
    username,
    action,
    timestamp: new Date().toISOString(),
  };
  db.activityLogs.unshift(log);
  if (db.activityLogs.length > 500) db.activityLogs = db.activityLogs.slice(0, 500);
  writeDB(db);
}

function invalidateAnalyticsCache() {
  try {
    const db = readDB();
    if (db.analyticsCache) {
      db.analyticsCache.lastUpdated = new Date(0).toISOString();
      db.analyticsCache.preAggregated = null;
    }
    writeDB(db);
  } catch (_) { /* ignore */ }
}

// ─── FBR helpers ─────────────────────────────────────────────────────────────
function generateInvoiceHash(invoice: Partial<SaleInvoice>): string {
  const payloadString = JSON.stringify({
    invoiceNumber: invoice.invoiceNumber,
    items: (invoice.items || []).map((item) => ({
      productId: item.productId,
      qty: item.qty,
      sellingPrice: item.sellingPrice,
    })),
    totalAmount: invoice.finalAmount,
    taxAmount: (invoice as any).taxAmount || 0,
    timestamp: invoice.date,
  });
  return crypto.createHash("sha256").update(payloadString).digest("hex");
}

async function updateInvoiceQRCodeAndHash(invoice: any, hostHeader?: string): Promise<any> {
  const hash = generateInvoiceHash(invoice);
  invoice.fbr_hash = hash;
  try {
    let domainUrl = "https://rais-honda.replit.app";
    if (hostHeader) {
      const isLocal = hostHeader.includes("localhost") || hostHeader.includes("127.0.0.1");
      domainUrl = (isLocal ? "http://" : "https://") + hostHeader;
    }
    const verifyUrl = `${domainUrl}?invoice=${encodeURIComponent(invoice.fbrInvoiceNumber || invoice.invoiceNumber)}`;
    const qrImageBase64 = await QRCode.toDataURL(verifyUrl, {
      errorCorrectionLevel: "H",
      margin: 1,
      width: 400,
      color: { dark: "#000000", light: "#ffffff" },
    });
    invoice.qr_image_path = qrImageBase64;
    invoice.fbr_verified_status = invoice.fbrStatus === "Approved" ? "Approved" : "Pending";
  } catch (err) {
    logger.warn({ err }, "QR code generation failed");
  }
  return invoice;
}

// ─── FBR config & terminals ──────────────────────────────────────────────────
const fbrConfig = {
  apiUrl: "https://api.fbr.gov.pk/invoice/submit",
  apiKey: "fbr_atlas_honda_api_key_pk_2026",
  apiSecret: "fbr_hmac_sec_0918x23a",
  internetStatus: "Online",
  fbrServerStatus: "Operational",
};

const MULTI_TERMINALS = [
  { id: "T1", name: "Billing Counter 1", location: "Main Gate Exit" },
  { id: "T2", name: "Billing Counter 2", location: "Spare Parts Lobby" },
  { id: "W1", name: "Workshop Mechanic Desk", location: "Bay 1 & Tuning" },
  { id: "A1", name: "Admin Manager Office", location: "Backoffice Cabin" },
];

const activePartsLocks: Record<string, { terminalId: string; lockTime: string }> = {};

// Background FBR queue processor
function runFbrBackgroundWorker() {
  setInterval(async () => {
    try {
      const db = readDB();
      if (!db.fbrSyncQueue || db.fbrSyncQueue.length === 0) return;
      let modified = false;
      const pending = db.fbrSyncQueue.filter((i: any) => i.status === "Pending");
      for (const item of pending) {
        if (fbrConfig.internetStatus === "Offline") continue;
        item.lastAttempt = new Date().toISOString();
        item.retryCount += 1;
        const invoice = db.invoices.find((inv) => inv.id === item.invoiceId);
        if (!invoice) { item.status = "Rejected"; item.errorMessage = "Invoice not found"; modified = true; continue; }
        if (fbrConfig.fbrServerStatus === "Downtime") { item.errorMessage = "FBR 503: Gateway timeout"; modified = true; continue; }
        const fbrUsin = "12" + Math.floor(1000000000 + Math.random() * 9000000000);
        item.status = "Approved"; item.errorMessage = undefined;
        (invoice as any).fbrStatus = "Approved";
        (invoice as any).fbrInvoiceNumber = fbrUsin;
        (invoice as any).fbrSubmitTime = new Date().toISOString();
        await updateInvoiceQRCodeAndHash(invoice);
        if (!db.terminalSyncLogs) db.terminalSyncLogs = [];
        db.terminalSyncLogs.unshift({ id: "ts_" + Date.now(), terminalId: (invoice as any).terminalId || "T1", actionType: "SALE", status: "SUCCESS", timestamp: new Date().toISOString(), details: `FBR auto-synced ${invoice.invoiceNumber}. Ref: ${fbrUsin}` });
        modified = true;
      }
      if (modified) writeDB(db);
    } catch (e) {
      logger.warn({ e }, "FBR background worker error");
    }
  }, 10000);
}
runFbrBackgroundWorker();

// ─── Routes ──────────────────────────────────────────────────────────────────

// GET full database snapshot
router.get("/db", (req, res) => {
  res.json(readDB());
});

// POST save/update product
router.post("/products", (req, res) => {
  const db = readDB();
  const product: Product = req.body.product;
  const { userId, username } = req.body.auth || { userId: "1", username: "admin" };
  if (!product.id) {
    product.id = "prod_" + Date.now();
    db.products.push(product);
    logActivity(userId, username, `Added product: ${product.name}`);
  } else {
    const idx = db.products.findIndex((p) => p.id === product.id);
    if (idx !== -1) { db.products[idx] = product; logActivity(userId, username, `Updated product: ${product.name}`); }
    else { db.products.push(product); }
  }
  writeDB(db);
  res.json({ success: true, db });
});

// DELETE product
router.delete("/products/:id", (req, res) => {
  const db = readDB();
  const { userId, username } = req.body || { userId: "1", username: "admin" };
  const prod = db.products.find((p) => p.id === req.params.id);
  if (prod) {
    db.products = db.products.filter((p) => p.id !== req.params.id);
    logActivity(userId, username, `Deleted product: ${prod.name}`);
    writeDB(db);
  }
  res.json({ success: true, db });
});

// GET FBR queue & config
router.get("/fbr/queue", (req, res) => {
  const db = readDB();
  res.json({ queue: db.fbrSyncQueue || [], config: fbrConfig });
});

// POST FBR config update
router.post("/fbr/config", (req, res) => {
  const { internetStatus, fbrServerStatus, apiUrl, apiKey, apiSecret } = req.body;
  if (internetStatus) fbrConfig.internetStatus = internetStatus;
  if (fbrServerStatus) fbrConfig.fbrServerStatus = fbrServerStatus;
  if (apiUrl) fbrConfig.apiUrl = apiUrl;
  if (apiKey) fbrConfig.apiKey = apiKey;
  if (apiSecret) fbrConfig.apiSecret = apiSecret;
  res.json({ success: true, config: fbrConfig });
});

// POST manual FBR sync
router.post("/fbr/sync", async (req, res) => {
  const db = readDB();
  if (fbrConfig.internetStatus === "Offline") {
    res.status(400).json({ success: false, error: "Cannot sync: workstation in OFFLINE mode." }); return;
  }
  let successCount = 0;
  for (const item of (db.fbrSyncQueue || []).filter((q: any) => q.status === "Pending")) {
    if (fbrConfig.fbrServerStatus === "Downtime") { item.lastAttempt = new Date().toISOString(); item.errorMessage = "FBR servers down"; continue; }
    const invoice = db.invoices.find((i) => i.id === item.invoiceId);
    if (!invoice) { item.status = "Rejected"; continue; }
    const randCode = "12" + Math.floor(1000000000 + Math.random() * 9000000000);
    item.status = "Approved"; item.errorMessage = undefined; item.lastAttempt = new Date().toISOString();
    (invoice as any).fbrStatus = "Approved"; (invoice as any).fbrInvoiceNumber = randCode; (invoice as any).fbrSubmitTime = new Date().toISOString();
    await updateInvoiceQRCodeAndHash(invoice, req.get("host"));
    successCount++;
  }
  writeDB(db);
  invalidateAnalyticsCache();
  res.json({ success: true, db, syncedItems: successCount });
});

// GET terminals and locks
router.get("/sync/terminals", (_req, res) => {
  res.json({ terminals: MULTI_TERMINALS, locks: activePartsLocks });
});

// POST acquire/release stock lock
router.post("/sync/lock", (req, res) => {
  const { productId, terminalId, action } = req.body;
  if (!productId || !terminalId) return res.status(400).json({ error: "Missing productId or terminalId" });
  if (action === "acquire") {
    const existing = activePartsLocks[productId];
    if (existing && existing.terminalId !== terminalId) {
      return res.status(409).json({ success: false, error: `Item locked by terminal '${existing.terminalId}'` });
    }
    activePartsLocks[productId] = { terminalId, lockTime: new Date().toISOString() };
    return res.json({ success: true, message: "Lock acquired" });
  }
  delete activePartsLocks[productId];
  return res.json({ success: true, message: "Lock released" });
});

// GET terminal sync logs
router.get("/sync/logs", (_req, res) => {
  const db = readDB();
  res.json(db.terminalSyncLogs || []);
});

// GET analytics
router.get("/analytics", (req, res) => {
  const db = readDB();
  const sDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(0);
  const eDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

  const filtInv = db.invoices.filter((i) => { const d = new Date(i.date); return d >= sDate && d <= eDate; });
  const filtSrv = db.services.filter((s) => { const d = new Date(s.date); return d >= sDate && d <= eDate; });
  const filtExp = db.expenses.filter((e) => { const d = new Date(e.date); return d >= sDate && d <= eDate; });

  let grossProductSales = 0, totalDiscounts = 0, costOfGoodsSold = 0, totalTax = 0;
  filtInv.forEach((inv) => { grossProductSales += inv.subtotal; totalDiscounts += inv.discount; totalTax += (inv as any).taxAmount || 0; inv.items.forEach((item) => { costOfGoodsSold += item.purchasePrice * item.qty; }); });
  let grossWorkshopRevenue = 0; filtSrv.forEach((s) => { grossWorkshopRevenue += s.price; });
  let totalExpenses = 0; filtExp.forEach((e) => { totalExpenses += e.amount; });

  const grossRevenue = (grossProductSales - totalDiscounts) + grossWorkshopRevenue;
  const netProfit = grossRevenue - costOfGoodsSold - totalExpenses;
  const grossMargin = grossRevenue > 0 ? ((grossRevenue - costOfGoodsSold) / grossRevenue) * 100 : 0;
  const netMargin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;

  const hourlyPattern: Record<string, { hour: string; sales: number; count: number }> = {};
  for (let i = 0; i < 24; i++) { const h = String(i).padStart(2, "0") + ":00"; hourlyPattern[h] = { hour: h, sales: 0, count: 0 }; }
  filtInv.forEach((inv) => { const h = String(new Date(inv.date).getHours()).padStart(2, "0") + ":00"; if (hourlyPattern[h]) { hourlyPattern[h].sales += inv.finalAmount; hourlyPattern[h].count++; } });

  const pmCounts: Record<string, { name: string; value: number; total: number }> = { Cash: { name: "Cash", value: 0, total: 0 }, "Bank Transfer": { name: "Bank EFT", value: 0, total: 0 }, "Mobile Wallet": { name: "Wallet", value: 0, total: 0 } };
  filtInv.forEach((inv) => { const pm = inv.paymentMethod || "Cash"; if (pmCounts[pm]) { pmCounts[pm].value++; pmCounts[pm].total += inv.finalAmount; } });

  const custFreq: Record<string, { name: string; phone: string; count: number; totalSales: number }> = {};
  filtInv.forEach((inv) => { const ph = inv.customerPhone || "Walk-in"; if (!custFreq[ph]) custFreq[ph] = { name: inv.customerName || "Anonymous", phone: ph, count: 0, totalSales: 0 }; custFreq[ph].count++; custFreq[ph].totalSales += inv.finalAmount; });

  const prodQty: Record<string, { name: string; partNumber: string; qty: number }> = {};
  filtInv.forEach((inv) => { inv.items.forEach((item) => { if (!prodQty[item.productId]) prodQty[item.productId] = { name: item.name, partNumber: item.partNumber, qty: 0 }; prodQty[item.productId].qty += item.qty; }); });

  const soldIds = new Set(filtInv.flatMap((inv) => inv.items.map((it) => it.productId)));
  const deadStock = db.products.filter((p) => p.stock > 0 && !soldIds.has(p.id)).map((p) => ({ name: p.name, partNumber: p.partNumber, stock: p.stock, category: p.category, assetValue: p.purchasePrice * p.stock })).slice(0, 10);

  const svcTypes: Record<string, { name: string; count: number; revenue: number }> = {};
  filtSrv.forEach((s) => { if (!svcTypes[s.serviceType]) svcTypes[s.serviceType] = { name: s.serviceType, count: 0, revenue: 0 }; svcTypes[s.serviceType].count++; svcTypes[s.serviceType].revenue += s.price; });

  const oilChanges = db.services.filter((s) => s.serviceType === "Oil Change");
  const sentReminders = oilChanges.filter((s) => s.reminderStatus === "Sent" || s.reminderStatus === "Confirmed");
  const oilComplianceRate = oilChanges.length > 0 ? (sentReminders.length / oilChanges.length) * 100 : 100;

  const totalInventoryValue = db.products.reduce((acc, p) => acc + p.purchasePrice * p.stock, 0);

  res.json({
    timeRange: { startDate: sDate, endDate: eDate },
    financials: { grossProductSales, grossWorkshopRevenue, totalDiscounts, totalTaxCollected: totalTax, totalExpenses, costOfGoodsSold, grossRevenue, netProfit, grossMargin, netMargin },
    hourlyPattern: Object.values(hourlyPattern),
    paymentRatios: Object.values(pmCounts),
    customerRatings: Object.values(custFreq).sort((a, b) => b.totalSales - a.totalSales).slice(0, 10),
    inventoryIntelligence: { fastMoving: Object.values(prodQty).sort((a, b) => b.qty - a.qty).slice(0, 10), deadStock, stockTurnover: costOfGoodsSold / (totalInventoryValue || 1), totalInventoryAssets: totalInventoryValue },
    workshopAnalytics: { servicesLog: Object.values(svcTypes), oilComplianceRate },
  });
});

// POST create sale invoice
router.post("/sales", async (req, res) => {
  const db = readDB();
  const invoice: SaleInvoice = req.body.invoice;
  const { userId, username } = req.body.auth || { userId: "1", username: "admin" };
  const terminalId = (invoice as any).terminalId || "T1";

  const taxRate = (invoice as any).taxRate !== undefined ? (invoice as any).taxRate : 18;
  const taxableSubtotal = Math.max(0, invoice.subtotal - invoice.discount);
  const taxAmount = Math.round(taxableSubtotal * (taxRate / 100));
  (invoice as any).taxRate = taxRate;
  (invoice as any).taxAmount = taxAmount;
  invoice.finalAmount = taxableSubtotal + taxAmount;

  // Check concurrency locks
  for (const item of invoice.items) {
    const lock = activePartsLocks[item.productId];
    if (lock && lock.terminalId !== terminalId) {
      res.status(409).json({ error: `Product locked by terminal '${lock.terminalId}'` }); return;
    }
  }

  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const todayCount = db.invoices.filter((inv) => inv.date.startsWith(new Date().toISOString().slice(0, 10)) && (inv as any).terminalId === terminalId).length;
  invoice.invoiceNumber = `${terminalId}-INV-${todayStr}-${String(todayCount + 1).padStart(3, "0")}`;
  invoice.id = "inv_" + Date.now();
  invoice.date = new Date().toISOString();
  (invoice as any).fbrStatus = "Pending";
  (invoice as any).terminalId = terminalId;

  let profit = 0;
  invoice.items.forEach((item) => {
    const pIdx = db.products.findIndex((p) => p.id === item.productId);
    if (pIdx !== -1) { db.products[pIdx].stock = Math.max(0, db.products[pIdx].stock - item.qty); profit += (item.sellingPrice - item.purchasePrice) * item.qty; delete activePartsLocks[item.productId]; }
  });
  invoice.profit = Math.max(0, profit - invoice.discount);

  // Upsert customer
  if (invoice.customerPhone && invoice.customerId === "Walk-in") {
    const existing = db.customers.find((c) => c.phone === invoice.customerPhone);
    if (existing) { invoice.customerId = existing.id; }
    else {
      const nc: Customer = { id: "cust_" + Date.now(), name: invoice.customerName || "Walk-in", phone: invoice.customerPhone, address: invoice.customerAddress || "", bikeModel: invoice.customerBikeModel || "" };
      db.customers.push(nc);
      invoice.customerId = nc.id;
    }
  }

  await updateInvoiceQRCodeAndHash(invoice, req.get("host"));
  db.invoices.push(invoice);

  if (!db.fbrSyncQueue) db.fbrSyncQueue = [];
  db.fbrSyncQueue.push({ id: "q_" + Date.now(), invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, status: "Pending", retryCount: 0 });
  if (!db.terminalSyncLogs) db.terminalSyncLogs = [];
  db.terminalSyncLogs.push({ id: "ts_" + Date.now(), terminalId, actionType: "SALE", status: "SUCCESS", timestamp: new Date().toISOString(), details: `Receipt ${invoice.invoiceNumber}. Total: Rs. ${invoice.finalAmount}` });

  const targetAccId = invoice.paymentMethod === "Cash" ? "cash_chest" : (invoice.bankAccountId || "bank_2");
  const accIdx = db.accounts.findIndex((a) => a.id === targetAccId);
  if (accIdx !== -1) {
    db.accounts[accIdx].balance += invoice.finalAmount;
    const entry: BankLedgerEntry = { id: "led_" + Date.now(), bankAccountId: targetAccId, bankName: db.accounts[accIdx].bankName, date: invoice.date, type: "Credit", amount: invoice.finalAmount, description: `Sale [${terminalId}] ${invoice.invoiceNumber} (${invoice.customerName})`, balanceAfter: db.accounts[accIdx].balance, referenceId: invoice.id };
    db.ledger.unshift(entry);
  }

  logActivity(userId, username, `Created invoice ${invoice.invoiceNumber} on ${terminalId}. Total: Rs. ${invoice.finalAmount}`);
  writeDB(db);
  invalidateAnalyticsCache();
  res.json({ success: true, db, invoice });
});

// PUT update invoice (edit customer info, payment, discount, and/or items)
router.put("/sales/:id", async (req, res) => {
  const db = readDB();
  const { id } = req.params;
  const { updates, auth } = req.body;
  const { userId, username } = auth || { userId: "1", username: "admin" };

  const invIdx = db.invoices.findIndex((inv) => inv.id === id);
  if (invIdx === -1) { res.status(404).json({ success: false, error: "Invoice not found" }); return; }

  const original = db.invoices[invIdx];
  const newDiscount = updates.discount !== undefined ? Number(updates.discount) : original.discount;

  const updatedInvoice = {
    ...original,
    customerName:     updates.customerName     ?? original.customerName,
    customerPhone:    updates.customerPhone     ?? original.customerPhone,
    customerAddress:  updates.customerAddress   ?? original.customerAddress,
    customerBikeModel: updates.customerBikeModel ?? original.customerBikeModel,
    paymentMethod:    updates.paymentMethod     ?? original.paymentMethod,
    bankAccountId:    updates.bankAccountId     ?? original.bankAccountId,
    discount:         newDiscount,
    notes:            updates.notes             ?? (original as any).notes,
  } as SaleInvoice;

  // ── Item editing: restore old stock, apply new stock, recalculate totals ──
  if (updates.items && Array.isArray(updates.items)) {
    // Step 1: restore stock from original items
    original.items.forEach((oldItem) => {
      const pIdx = db.products.findIndex((p) => p.id === oldItem.productId);
      if (pIdx !== -1) db.products[pIdx].stock += oldItem.qty;
    });

    // Step 2: deduct stock for new items (floor at 0)
    updates.items.forEach((newItem: SaleItem) => {
      const pIdx = db.products.findIndex((p) => p.id === newItem.productId);
      if (pIdx !== -1) db.products[pIdx].stock = Math.max(0, db.products[pIdx].stock - newItem.qty);
    });

    updatedInvoice.items = updates.items;

    // Step 3: recalculate financials
    const newSubtotal = updates.items.reduce((s: number, i: SaleItem) => s + i.sellingPrice * i.qty, 0);
    const taxRate = (original as any).taxRate ?? 18;
    const taxableSubtotal = Math.max(0, newSubtotal - newDiscount);
    const taxAmount = Math.round(taxableSubtotal * (taxRate / 100));
    const newProfit = updates.items.reduce((s: number, i: SaleItem) => s + (i.sellingPrice - i.purchasePrice) * i.qty, 0) - newDiscount;

    updatedInvoice.subtotal     = newSubtotal;
    updatedInvoice.finalAmount  = taxableSubtotal + taxAmount;
    updatedInvoice.profit       = Math.max(0, newProfit);
    (updatedInvoice as any).taxRate   = taxRate;
    (updatedInvoice as any).taxAmount = taxAmount;

  } else if (updates.discount !== undefined && Number(updates.discount) !== original.discount) {
    // No item change — just discount changed
    const taxRate = (original as any).taxRate ?? 18;
    const taxableSubtotal = Math.max(0, original.subtotal - newDiscount);
    const taxAmount = Math.round(taxableSubtotal * (taxRate / 100));
    (updatedInvoice as any).taxRate   = taxRate;
    (updatedInvoice as any).taxAmount = taxAmount;
    updatedInvoice.finalAmount = taxableSubtotal + taxAmount;
    updatedInvoice.profit = Math.max(0, (original.profit ?? 0) + (original.discount - newDiscount));
  }

  await updateInvoiceQRCodeAndHash(updatedInvoice, req.get("host"));
  db.invoices[invIdx] = updatedInvoice;

  logActivity(userId, username, `Edited invoice ${original.invoiceNumber} (${updates.items ? 'items+' : ''}customer/payment)`);
  writeDB(db);
  invalidateAnalyticsCache();
  res.json({ success: true, db, invoice: updatedInvoice });
});

// GET verify invoice
router.get("/sales/verify", (req, res) => {
  const invoiceNumber = req.query.invoice as string;
  if (!invoiceNumber) { res.status(400).json({ success: false, error: "Invoice number required." }); return; }
  const db = readDB();
  const invoice = db.invoices.find((inv) =>
    inv.invoiceNumber === invoiceNumber ||
    inv.id === invoiceNumber ||
    (inv as any).fbrInvoiceNumber === invoiceNumber
  );
  if (!invoice) { res.status(404).json({ success: false, error: `Invoice '${invoiceNumber}' not found.` }); return; }
  if (!db.terminalSyncLogs) db.terminalSyncLogs = [];
  db.terminalSyncLogs.unshift({ id: "ts_verify_" + Date.now(), terminalId: (invoice as any).terminalId || "T1", actionType: "SALE", status: "SUCCESS", timestamp: new Date().toISOString(), details: `Audit query for ${invoice.invoiceNumber}. Verified.` });
  writeDB(db);
  res.json({ success: true, invoice, storeDetails: { name: "Rais Honda Motor Labs & Parts", ntn: "8125439-0", address: "Main Chowk Road, Multan, Pakistan", phone: "+92-300-9805610", tagline: "Premium Automotive Honda Parts & Mechanical SLA Labs" } });
});

// POST record purchase — creates order as PENDING; stock is NOT updated here.
// Stock is only updated when the order is marked as received via PATCH below.
router.post("/purchases", (req, res) => {
  const db = readDB();
  const purchase: PurchaseRecord = req.body.purchase;
  const { userId, username } = req.body.auth || { userId: "1", username: "admin" };

  purchase.id = "pur_" + Date.now();
  purchase.date = new Date().toISOString();
  purchase.status = 'pending';
  if (!purchase.amountPaid) purchase.amountPaid = 0;

  // Auto-create supplier if new
  if (purchase.supplierName && !db.suppliers.find((s) => s.name.toLowerCase() === purchase.supplierName.toLowerCase())) {
    db.suppliers.push({ id: "sup_" + Date.now(), name: purchase.supplierName, phone: "", address: "", balance: 0 });
  }
  db.purchases.unshift(purchase);

  // Record bank/cash debit if amount was paid upfront
  const paid = purchase.amountPaid || 0;
  if (paid > 0) {
    const targetAccId = purchase.paymentMethod === "Cash" ? "cash_chest" : (purchase.bankAccountId || "bank_1");
    const accIdx = db.accounts.findIndex((a) => a.id === targetAccId);
    if (accIdx !== -1) {
      db.accounts[accIdx].balance -= paid;
      db.ledger.unshift({ id: "led_" + Date.now(), bankAccountId: targetAccId, bankName: db.accounts[accIdx].bankName, date: purchase.date, type: "Debit", amount: paid, description: `Purchase ${purchase.invoiceRef} (${purchase.supplierName})`, balanceAfter: db.accounts[accIdx].balance, referenceId: purchase.id });
    }
  }

  logActivity(userId, username, `Purchase Order ${purchase.invoiceRef} created (pending). Total: Rs. ${purchase.totalAmount}, Paid: Rs. ${paid}`);
  writeDB(db);
  res.json({ success: true, db });
});

// PUT update purchase order (edit prices, quantities, items, payment)
router.put("/purchases/:id", (req, res) => {
  const db = readDB();
  const { userId, username } = req.body.auth || { userId: "1", username: "admin" };
  const idx = db.purchases.findIndex((p) => p.id === req.params.id);
  if (idx === -1) { res.status(404).json({ error: "Purchase not found" }); return; }

  const existing = db.purchases[idx];
  const updates: PurchaseRecord = req.body.purchase;

  // If already received, reverse old inventory effect then apply updated items
  if (existing.status === 'received') {
    // Step 1: subtract old quantities from inventory
    existing.items.forEach((oldItem) => {
      const pIdx = db.products.findIndex((p) => p.id === oldItem.productId);
      if (pIdx !== -1) {
        db.products[pIdx].stock = Math.max(0, db.products[pIdx].stock - oldItem.qty);
      }
    });

    // Step 2: apply new quantities + recalculate weighted avg purchase price
    updates.items.forEach((newItem) => {
      const pIdx = db.products.findIndex((p) => p.id === newItem.productId);
      if (pIdx !== -1) {
        const curStock = db.products[pIdx].stock;
        const curPrice = db.products[pIdx].purchasePrice;
        if (curStock + newItem.qty > 0) {
          db.products[pIdx].purchasePrice = Math.round(
            ((curStock * curPrice) + (newItem.qty * newItem.purchasePrice)) / (curStock + newItem.qty)
          );
        } else {
          db.products[pIdx].purchasePrice = newItem.purchasePrice;
        }
        db.products[pIdx].stock += newItem.qty;
      }
    });
  }

  // Update the purchase record (keep status + id + invoiceRef)
  db.purchases[idx] = {
    ...existing,
    supplierName:  updates.supplierName  || existing.supplierName,
    date:          updates.date          || existing.date,
    items:         updates.items,
    totalAmount:   updates.totalAmount,
    amountPaid:    updates.amountPaid    ?? existing.amountPaid,
    paymentMethod: updates.paymentMethod || existing.paymentMethod,
    bankAccountId: updates.bankAccountId ?? existing.bankAccountId,
    notes:         updates.notes,
  };

  logActivity(userId, username, `Purchase ${existing.invoiceRef} updated — Total: Rs. ${updates.totalAmount}, Paid: Rs. ${updates.amountPaid}`);
  writeDB(db);
  res.json({ success: true, db });
});

// PATCH mark purchase as received — this is where stock is updated
router.patch("/purchases/:id/receive", (req, res) => {
  const db = readDB();
  const { userId, username } = req.body.auth || { userId: "1", username: "admin" };
  const idx = db.purchases.findIndex((p) => p.id === req.params.id);
  if (idx === -1) { res.status(404).json({ error: "Purchase not found" }); return; }
  if (db.purchases[idx].status === 'received') { res.status(400).json({ error: "Purchase already received" }); return; }

  db.purchases[idx].status = 'received';

  // Update inventory stock and recalculate weighted average purchase price
  db.purchases[idx].items.forEach((item) => {
    const pIdx = db.products.findIndex((p) => p.id === item.productId);
    if (pIdx !== -1) {
      const oldStock = db.products[pIdx].stock;
      const oldPrice = db.products[pIdx].purchasePrice;
      // Weighted average cost
      if (oldStock + item.qty > 0) {
        db.products[pIdx].purchasePrice = Math.round(
          ((oldStock * oldPrice) + (item.qty * item.purchasePrice)) / (oldStock + item.qty)
        );
      } else {
        db.products[pIdx].purchasePrice = item.purchasePrice;
      }
      db.products[pIdx].stock += item.qty;
    }
  });

  logActivity(userId, username, `Purchase ${db.purchases[idx].invoiceRef} marked as received — inventory updated (+${db.purchases[idx].items.reduce((s, i) => s + i.qty, 0)} units)`);
  writeDB(db);
  res.json({ success: true, db });
});

// POST record workshop service
router.post("/services", (req, res) => {
  const db = readDB();
  const service: ServiceRecord = req.body.service;
  const { userId, username } = req.body.auth || { userId: "1", username: "admin" };

  // Multi-service: compute total price and primary service type from serviceLines
  if (service.serviceLines && service.serviceLines.length > 0) {
    service.price = service.serviceLines.reduce((sum, l) => sum + Number(l.price), 0);
    const hasOilChange = service.serviceLines.some((l) => l.serviceType === "Oil Change");
    service.serviceType = hasOilChange ? "Oil Change" : service.serviceLines[0].serviceType;
  }

  if (!service.invoiceNumber) {
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const cnt = db.services.filter((s) => s.date.startsWith(new Date().toISOString().slice(0, 10))).length;
    service.invoiceNumber = `SRV-${todayStr}-${String(cnt + 1).padStart(3, "0")}`;
  }
  service.id = "srv_" + Date.now();
  service.date = new Date().toISOString();

  if (service.serviceType === "Oil Change") {
    const rd = new Date(); rd.setDate(rd.getDate() + 30);
    service.nextReminderDate = rd.toISOString();
    service.reminderStatus = "Pending";
  }

  if (service.customerPhone && !db.customers.find((c) => c.phone === service.customerPhone)) {
    db.customers.push({ id: "cust_" + Date.now(), name: service.customerName, phone: service.customerPhone, address: "", bikeModel: service.bikeModel });
  }

  db.services.push(service);

  const cashIdx = db.accounts.findIndex((a) => a.id === "cash_chest");
  if (cashIdx !== -1) {
    db.accounts[cashIdx].balance += service.price;
    const svcLabel = service.serviceLines && service.serviceLines.length > 1
      ? `${service.serviceLines.length} services`
      : service.serviceType;
    db.ledger.unshift({ id: "led_" + Date.now(), bankAccountId: "cash_chest", bankName: "Cash-in-Hand Drawer", date: service.date, type: "Credit", amount: service.price, description: `Workshop: ${svcLabel} — ${service.invoiceNumber}`, balanceAfter: db.accounts[cashIdx].balance, referenceId: service.id });
  }

  logActivity(userId, username, `Workshop service ${service.invoiceNumber}. Earned: Rs. ${service.price}`);
  writeDB(db);
  res.json({ success: true, db });
});

// PUT update service record
router.put("/services/:id", (req, res) => {
  const db = readDB();
  const { userId, username } = req.body.auth || { userId: "1", username: "admin" };
  const idx = db.services.findIndex((s) => s.id === req.params.id);
  if (idx === -1) { res.status(404).json({ error: "Service record not found" }); return; }

  const existing = db.services[idx];
  const updates: Partial<ServiceRecord> = req.body.updates;

  // Multi-service: if serviceLines provided, recompute price and primary type
  const newLines = updates.serviceLines ?? existing.serviceLines;
  let newPrice: number;
  let newType: ServiceRecord["serviceType"];
  if (newLines && newLines.length > 0) {
    newPrice = newLines.reduce((sum, l) => sum + Number(l.price), 0);
    const hasOilChange = newLines.some((l) => l.serviceType === "Oil Change");
    newType = hasOilChange ? "Oil Change" : newLines[0].serviceType;
  } else {
    newPrice = updates.price !== undefined ? Number(updates.price) : existing.price;
    newType = (updates.serviceType ?? existing.serviceType) as ServiceRecord["serviceType"];
  }

  // Adjust cash balance for price difference
  const oldPrice = existing.price;
  const priceDiff = newPrice - oldPrice;
  if (priceDiff !== 0) {
    const cashIdx = db.accounts.findIndex((a) => a.id === "cash_chest");
    if (cashIdx !== -1) {
      db.accounts[cashIdx].balance += priceDiff;
      db.ledger.unshift({
        id: "led_" + Date.now(), bankAccountId: "cash_chest",
        bankName: "Cash-in-Hand Drawer", date: new Date().toISOString(),
        type: priceDiff > 0 ? "Credit" : "Debit",
        amount: Math.abs(priceDiff),
        description: `Workshop edit adjustment: ${existing.invoiceNumber} (${priceDiff > 0 ? '+' : ''}Rs. ${priceDiff})`,
        balanceAfter: db.accounts[cashIdx].balance,
        referenceId: existing.id,
      });
    }
  }

  // Rebuild reminder fields based on whether Oil Change is in the service lines
  let nextReminderDate = existing.nextReminderDate;
  let reminderStatus = existing.reminderStatus;
  if (newType === "Oil Change" && existing.serviceType !== "Oil Change") {
    const rd = new Date(); rd.setDate(rd.getDate() + 30);
    nextReminderDate = rd.toISOString();
    reminderStatus = "Pending";
  } else if (newType !== "Oil Change") {
    nextReminderDate = undefined;
    reminderStatus = undefined;
  }

  db.services[idx] = {
    ...existing,
    customerName:     updates.customerName     ?? existing.customerName,
    customerPhone:    updates.customerPhone     ?? existing.customerPhone,
    bikeModel:        updates.bikeModel         ?? existing.bikeModel,
    serviceType:      newType,
    price:            newPrice,
    serviceLines:     newLines,
    notes:            updates.notes             ?? existing.notes,
    nextReminderDate,
    reminderStatus:   (updates.reminderStatus   ?? reminderStatus) as ServiceRecord["reminderStatus"],
  };

  logActivity(userId, username, `Workshop service ${existing.invoiceNumber} updated — Price: Rs. ${newPrice}`);
  writeDB(db);
  invalidateAnalyticsCache();
  res.json({ success: true, db });
});

// POST bulk update reminder status
router.post("/reminders/status", (req, res) => {
  const db = readDB();
  const { ids, status } = req.body;
  const { userId, username } = req.body.auth || { userId: "1", username: "admin" };
  let count = 0;
  db.services = db.services.map((srv) => { if (ids.includes(srv.id)) { srv.reminderStatus = status; count++; } return srv; });
  logActivity(userId, username, `Updated ${count} reminders to "${status}"`);
  writeDB(db);
  res.json({ success: true, db });
});

// POST record expense
router.post("/expenses", (req, res) => {
  const db = readDB();
  const expense: Expense = req.body.expense;
  const { userId, username } = req.body.auth || { userId: "1", username: "admin" };
  expense.id = "exp_" + Date.now();
  expense.date = new Date().toISOString();
  db.expenses.unshift(expense);

  const cashIdx = db.accounts.findIndex((a) => a.id === "cash_chest");
  if (cashIdx !== -1) {
    db.accounts[cashIdx].balance -= expense.amount;
    db.ledger.unshift({ id: "led_" + Date.now(), bankAccountId: "cash_chest", bankName: "Cash-in-Hand Drawer", date: expense.date, type: "Debit", amount: expense.amount, description: `Expense: ${expense.category} - ${expense.description}`, balanceAfter: db.accounts[cashIdx].balance, referenceId: expense.id });
  }

  logActivity(userId, username, `Expense [${expense.category}]: Rs. ${expense.amount}`);
  writeDB(db);
  res.json({ success: true, db });
});

// PUT update expense
router.put("/expenses/:id", (req, res) => {
  const db = readDB();
  const { userId, username } = req.body.auth || { userId: "1", username: "admin" };
  const idx = db.expenses.findIndex((e) => e.id === req.params.id);
  if (idx === -1) { res.status(404).json({ error: "Expense not found" }); return; }

  const old = db.expenses[idx];
  const { category, amount, description, date } = req.body;
  const newAmount = Number(amount) || old.amount;
  const diff = newAmount - old.amount;

  db.expenses[idx] = { ...old, category: category || old.category, amount: newAmount, description: description || old.description, date: date || old.date };

  // Adjust ledger if amount changed
  if (diff !== 0) {
    const accId = (old as any).bankAccountId || "cash_chest";
    const accIdx = db.accounts.findIndex((a) => a.id === accId);
    if (accIdx !== -1) {
      db.accounts[accIdx].balance -= diff;
      db.ledger.unshift({ id: "led_" + Date.now(), bankAccountId: accId, bankName: db.accounts[accIdx].bankName, date: new Date().toISOString(), type: "Debit", amount: Math.abs(diff), description: `Expense correction: ${db.expenses[idx].category} - ${db.expenses[idx].description}`, balanceAfter: db.accounts[accIdx].balance, referenceId: old.id });
    }
  }

  logActivity(userId, username, `Expense updated [${db.expenses[idx].category}]: Rs. ${newAmount}`);
  writeDB(db);
  res.json({ success: true, db });
});

// DELETE expense
router.delete("/expenses/:id", (req, res) => {
  const db = readDB();
  const { userId, username } = req.body?.auth || { userId: "1", username: "admin" };
  const idx = db.expenses.findIndex((e) => e.id === req.params.id);
  if (idx === -1) { res.status(404).json({ error: "Expense not found" }); return; }

  const exp = db.expenses[idx];
  // Reverse the debit from the account
  const accId = (exp as any).bankAccountId || "cash_chest";
  const accIdx = db.accounts.findIndex((a) => a.id === accId);
  if (accIdx !== -1) {
    db.accounts[accIdx].balance += exp.amount;
    db.ledger.unshift({ id: "led_" + Date.now(), bankAccountId: accId, bankName: db.accounts[accIdx].bankName, date: new Date().toISOString(), type: "Credit", amount: exp.amount, description: `Expense reversal: ${exp.category} - ${exp.description}`, balanceAfter: db.accounts[accIdx].balance, referenceId: exp.id });
  }

  db.expenses.splice(idx, 1);
  logActivity(userId, username, `Expense deleted [${exp.category}]: Rs. ${exp.amount}`);
  writeDB(db);
  res.json({ success: true, db });
});

// POST bank account transaction
router.post("/bank-accounts/transaction", (req, res) => {
  const db = readDB();
  const { id, type, amount, description } = req.body;
  const { userId, username } = req.body.auth || { userId: "1", username: "admin" };
  const accIdx = db.accounts.findIndex((a) => a.id === id);
  if (accIdx === -1) { res.status(404).json({ error: "Account not found" }); return; }
  const acc = db.accounts[accIdx];
  if (type === "Credit") acc.balance += amount; else acc.balance -= amount;
  db.ledger.unshift({ id: "led_" + Date.now(), bankAccountId: id, bankName: acc.bankName, date: new Date().toISOString(), type, amount, description, balanceAfter: acc.balance });
  logActivity(userId, username, `Manual ${type} on ${acc.bankName}: Rs. ${amount}`);
  writeDB(db);
  res.json({ success: true, db });
});

// POST create customer
router.post("/customers", (req, res) => {
  const db = readDB();
  const { userId, username } = req.body.auth || { userId: "1", username: "admin" };
  const customer: Customer = req.body.customer;
  customer.id = "cust_" + Date.now();
  customer.creditBalance = customer.creditBalance || 0;
  db.customers.push(customer);
  logActivity(userId, username, `Customer added: ${customer.name}`);
  writeDB(db);
  res.json({ success: true, db });
});

// PUT update customer
router.put("/customers/:id", (req, res) => {
  const db = readDB();
  const { userId, username } = req.body.auth || { userId: "1", username: "admin" };
  const idx = db.customers.findIndex((c) => c.id === req.params.id);
  if (idx === -1) { res.status(404).json({ error: "Customer not found" }); return; }
  db.customers[idx] = { ...db.customers[idx], ...req.body.customer };
  logActivity(userId, username, `Customer updated: ${db.customers[idx].name}`);
  writeDB(db);
  res.json({ success: true, db });
});

// DELETE customer
router.delete("/customers/:id", (req, res) => {
  const db = readDB();
  const { userId, username } = req.body?.auth || { userId: "1", username: "admin" };
  const idx = db.customers.findIndex((c) => c.id === req.params.id);
  if (idx === -1) { res.status(404).json({ error: "Customer not found" }); return; }
  const name = db.customers[idx].name;
  db.customers.splice(idx, 1);
  logActivity(userId, username, `Customer deleted: ${name}`);
  writeDB(db);
  res.json({ success: true, db });
});

// POST create backup
router.post("/backup/create", (req, res) => {
  const db = readDB();
  const { userId, username, type } = req.body || { userId: "1", username: "admin", type: "Manual" };
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `honda_backup_${timestamp}.json`;
  const backupPath = path.join(BACKUPS_DIR, filename);
  try {
    fs.writeFileSync(backupPath, JSON.stringify(db, null, 2));
    const size = fs.statSync(backupPath).size;
    const record: BackupHistory = { id: "bk_" + Date.now(), timestamp: new Date().toISOString(), filename, size, type: type || "Manual" };
    db.backups.unshift(record);
    logActivity(userId, username, `Backup created: ${filename} (${Math.round(size / 1024)} KB)`);
    writeDB(db);
    res.json({ success: true, db, backupRecord: record });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST restore from backup
router.post("/backup/restore", (req, res) => {
  const { backupData, auth } = req.body;
  const { userId, username } = auth || { userId: "1", username: "admin" };
  if (!backupData || typeof backupData !== "object") { res.status(400).json({ success: false, error: "Invalid backup structure." }); return; }
  if (!backupData.products || !backupData.invoices || !backupData.services || !backupData.accounts) { res.status(400).json({ success: false, error: "Backup missing required tables." }); return; }
  try {
    const oldDB = readDB();
    const restored: AppDatabase = { ...backupData, users: backupData.users || oldDB.users, backups: oldDB.backups };
    writeDB(restored);
    logActivity(userId, username, `Database restored with ${restored.products?.length || 0} products`);
    res.json({ success: true, db: restored });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST save/update user
router.post("/users", (req, res) => {
  const db = readDB();
  const user: User = req.body.user;
  const { userId, username } = req.body.auth || { userId: "1", username: "admin" };
  if (!user.id) {
    user.id = "user_" + Date.now();
    if (!user.status) user.status = "Active";
    db.users.push(user);
    logActivity(userId, username, `Added user: ${user.name} (${user.role})`);
  } else {
    const idx = db.users.findIndex((u) => u.id === user.id);
    if (idx !== -1) { db.users[idx] = { ...db.users[idx], ...user }; logActivity(userId, username, `Updated user: ${user.name}`); }
    else db.users.push(user);
  }
  writeDB(db);
  res.json({ success: true, db });
});

// DELETE user
router.delete("/users/:id", (req, res) => {
  const db = readDB();
  const { userId, username } = req.body || { userId: "1", username: "admin" };
  const user = db.users.find((u) => u.id === req.params.id);
  if (user) {
    db.users = db.users.filter((u) => u.id !== req.params.id);
    logActivity(userId, username, `Deleted user: ${user.name}`);
    writeDB(db);
  }
  res.json({ success: true, db });
});

export default router;
