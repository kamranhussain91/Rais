import type {
  BikeRow,
  CustomerRow,
  SaleRow,
  BankRow,
  BankTransactionRow,
  ExpenseRow,
  PurchaseOrderRow,
} from "@workspace/db";

export function serializeBike(b: BikeRow) {
  return {
    id: b.id,
    name: b.name,
    brand: b.brand,
    model: b.model,
    category: b.category,
    color: b.color,
    engineCc: b.engineCc,
    purchasePrice: Number(b.purchasePrice),
    salePrice: Number(b.salePrice),
    stock: b.stock,
    lowStockThreshold: b.lowStockThreshold,
    sku: b.sku,
    imageUrl: b.imageUrl,
    notes: b.notes,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  };
}

export function serializeCustomer(c: CustomerRow) {
  return {
    id: c.id,
    fullName: c.fullName,
    phone: c.phone,
    email: c.email,
    address: c.address,
    cnic: c.cnic,
    notes: c.notes,
    createdAt: c.createdAt.toISOString(),
  };
}

export function serializeSale(
  s: SaleRow,
  customer: CustomerRow,
  bike: BikeRow,
) {
  return {
    id: s.id,
    invoiceNo: s.invoiceNo,
    customerId: s.customerId,
    bikeId: s.bikeId,
    quantity: s.quantity,
    unitPrice: Number(s.unitPrice),
    discount: Number(s.discount),
    totalAmount: Number(s.totalAmount),
    amountPaid: Number(s.amountPaid),
    amountDue: Number(s.amountDue),
    paymentMethod: s.paymentMethod,
    paymentStatus: s.paymentStatus,
    notes: s.notes,
    createdAt: s.createdAt.toISOString(),
    customer: serializeCustomer(customer),
    bike: serializeBike(bike),
  };
}

export function serializeBank(b: BankRow, balance?: number) {
  return {
    id: b.id,
    name: b.name,
    accountNumber: b.accountNumber,
    openingBalance: Number(b.openingBalance),
    balance: balance !== undefined ? balance : Number(b.openingBalance),
    notes: b.notes,
    createdAt: b.createdAt.toISOString(),
  };
}

export function serializeBankTransaction(
  t: BankTransactionRow,
  bank?: BankRow | null,
) {
  return {
    id: t.id,
    bankId: t.bankId,
    bankName: bank?.name ?? null,
    type: t.type,
    amount: Number(t.amount),
    description: t.description,
    refType: t.refType,
    refId: t.refId,
    createdAt: t.createdAt.toISOString(),
  };
}

export function serializeExpense(e: ExpenseRow, bank?: BankRow | null) {
  return {
    id: e.id,
    expenseDate: e.expenseDate,
    category: e.category,
    description: e.description,
    paidTo: e.paidTo,
    amount: Number(e.amount),
    bankId: e.bankId,
    bankName: bank?.name ?? null,
    paymentMethod: e.paymentMethod,
    notes: e.notes,
    createdAt: e.createdAt.toISOString(),
  };
}

export function serializePurchaseOrder(
  p: PurchaseOrderRow,
  bike?: BikeRow | null,
  bank?: BankRow | null,
) {
  return {
    id: p.id,
    orderNo: p.orderNo,
    supplierName: p.supplierName,
    bikeId: p.bikeId,
    bikeName: bike ? `${bike.brand} ${bike.name}` : null,
    quantity: p.quantity,
    unitCost: Number(p.unitCost),
    totalCost: Number(p.totalCost),
    status: p.status,
    bankId: p.bankId,
    bankName: bank?.name ?? null,
    orderDate: p.orderDate,
    receivedDate: p.receivedDate,
    notes: p.notes,
    createdAt: p.createdAt.toISOString(),
  };
}
