import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useGetSale, useDeleteSale, useAddSalePayment, getGetSaleQueryKey, getListSalesQueryKey, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatPKR, formatDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Printer, ArrowLeft, Trash2, CreditCard, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function SaleDetail() {
  const { id } = useParams();
  const saleId = parseInt(id || "0", 10);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("Cash");
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  const { data: sale, isLoading } = useGetSale(saleId, {
    query: { enabled: !!saleId, queryKey: getGetSaleQueryKey(saleId) },
  });
  
  const deleteMutation = useDeleteSale();
  const paymentMutation = useAddSalePayment();

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!sale) return <div className="p-8 text-center">Invoice not found</div>;

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this sale? This action cannot be undone and will restock the item.")) {
      deleteMutation.mutate({ id: saleId }, {
        onSuccess: () => {
          queryClient.invalidateQueries();
          toast({ title: "Success", description: "Sale deleted and stock reverted" });
          setLocation("/sales");
        }
      });
    }
  };

  const handleRecordPayment = () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Error", description: "Please enter a valid amount", variant: "destructive" });
      return;
    }
    
    if (amount > sale.amountDue) {
      toast({ title: "Error", description: "Amount cannot exceed the due balance", variant: "destructive" });
      return;
    }

    paymentMutation.mutate({ 
      id: saleId, 
      data: { amount, paymentMethod } 
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries();
        setIsPaymentOpen(false);
        setPaymentAmount("");
        toast({ title: "Success", description: "Payment recorded successfully" });
      }
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Action Bar - Hidden in print */}
      <div className="flex items-center justify-between no-print mb-6">
        <Link href="/sales">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Sales
          </Button>
        </Link>
        <div className="flex gap-2">
          {sale.paymentStatus !== "paid" && (
            <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary" onClick={() => setPaymentAmount(sale.amountDue.toString())}>
                  <CreditCard className="mr-2 h-4 w-4" /> Record Payment
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record Payment</DialogTitle>
                  <DialogDescription>
                    Invoice {sale.invoiceNo} &bull; Balance Due: <span className="font-bold text-destructive">{formatPKR(sale.amountDue)}</span>
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Payment Amount</label>
                    <Input 
                      type="number" 
                      value={paymentAmount} 
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      max={sale.amountDue}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Payment Method</label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                        <SelectItem value="Credit Card">Credit Card</SelectItem>
                        <SelectItem value="Cheque">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full mt-4" onClick={handleRecordPayment} disabled={paymentMutation.isPending}>
                    {paymentMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit Payment
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          
          <Button onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Print Receipt
          </Button>
          
          <Button variant="destructive" size="icon" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Printable Receipt Area */}
      <Card className="printable-receipt bg-white text-black">
        <CardContent className="p-8 sm:p-12">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-gray-200 pb-8 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-amber-500 mb-1">Rais Motors</h1>
              <p className="text-gray-500 text-sm">Motorcycle Showroom & Services</p>
              <p className="text-gray-500 text-sm mt-1">123 Main Auto Market, City</p>
              <p className="text-gray-500 text-sm">Phone: 0300-0000000</p>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-bold text-gray-800 mb-1">INVOICE</h2>
              <p className="font-mono font-medium text-gray-600">{sale.invoiceNo}</p>
              <p className="text-gray-500 text-sm mt-2">Date: {formatDate(sale.createdAt)}</p>
              
              <div className="mt-4 inline-block">
                {sale.paymentStatus === 'paid' ? (
                  <div className="flex items-center text-green-600 font-bold border-2 border-green-600 px-3 py-1 rounded">
                    <CheckCircle2 className="h-4 w-4 mr-1" /> PAID
                  </div>
                ) : sale.paymentStatus === 'partial' ? (
                  <div className="text-orange-500 font-bold border-2 border-orange-500 px-3 py-1 rounded">
                    PARTIAL
                  </div>
                ) : (
                  <div className="text-red-500 font-bold border-2 border-red-500 px-3 py-1 rounded">
                    UNPAID
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bill To */}
          <div className="mb-8">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Billed To</h3>
            <p className="font-bold text-lg text-gray-800">{sale.customer.fullName}</p>
            <p className="text-gray-600">Phone: {sale.customer.phone || "—"}</p>
            <p className="text-gray-600 text-sm mt-1">CNIC: {sale.customer.cnic || "—"}</p>
            {sale.customer.email && <p className="text-gray-600 text-sm mt-1">Email: {sale.customer.email}</p>}
            <p className="text-gray-600 text-sm mt-1">Address: {sale.customer.address || "—"}</p>
          </div>

          {/* Line Items */}
          <div className="mb-8">
            <Table className="text-black">
              <TableHeader>
                <TableRow className="border-gray-200">
                  <TableHead className="font-bold text-gray-700">Description</TableHead>
                  <TableHead className="text-right font-bold text-gray-700">Qty</TableHead>
                  <TableHead className="text-right font-bold text-gray-700">Unit Price</TableHead>
                  <TableHead className="text-right font-bold text-gray-700">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="border-gray-200">
                  <TableCell>
                    <p className="font-medium text-gray-900">{sale.bike.brand} {sale.bike.name}</p>
                    <p className="text-sm text-gray-500">Model: {sale.bike.model} &bull; Color: {sale.bike.color || "N/A"}</p>
                    <p className="text-xs font-mono text-gray-400 mt-1">SKU: {sale.bike.sku}</p>
                  </TableCell>
                  <TableCell className="text-right">{sale.quantity}</TableCell>
                  <TableCell className="text-right">{formatPKR(sale.unitPrice)}</TableCell>
                  <TableCell className="text-right font-medium">{formatPKR(sale.quantity * sale.unitPrice)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Totals */}
          <div className="flex justify-end border-t border-gray-200 pt-6">
            <div className="w-64 space-y-3">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatPKR(sale.quantity * sale.unitPrice)}</span>
              </div>
              {sale.discount > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Discount</span>
                  <span className="text-red-500">-{formatPKR(sale.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold text-gray-900 border-t border-gray-200 pt-3">
                <span>Total</span>
                <span>{formatPKR(sale.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-gray-600 pt-2">
                <span>Amount Paid</span>
                <span>{formatPKR(sale.amountPaid)}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-3">
                <span>Balance Due</span>
                <span className={sale.amountDue > 0 ? "text-red-600" : "text-green-600"}>
                  {formatPKR(sale.amountDue)}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Notes */}
          <div className="mt-16 pt-8 border-t border-gray-200 text-sm text-gray-500">
            {sale.notes && (
              <div className="mb-4">
                <strong>Notes: </strong> {sale.notes}
              </div>
            )}
            <p>Thank you for your business! All vehicles are subject to company warranty terms. Returns are not accepted after registration.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
