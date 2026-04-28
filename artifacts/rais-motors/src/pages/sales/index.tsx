import { useState } from "react";
import { useListSales, useCreateSale, useListBikes, useListCustomers, getListSalesQueryKey, type SaleInput, type ListSalesPaymentStatus } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatPKR, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, MoreHorizontal, ReceiptText, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";

const saleSchema = z.object({
  customerId: z.coerce.number().min(1, "Customer is required"),
  bikeId: z.coerce.number().min(1, "Bike is required"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.coerce.number().min(0, "Unit price must be positive"),
  discount: z.coerce.number().min(0).optional(),
  amountPaid: z.coerce.number().min(0, "Amount paid cannot be negative"),
  paymentMethod: z.string().min(1, "Payment method is required"),
  notes: z.string().optional().nullable(),
});

type SaleFormValues = z.infer<typeof saleSchema>;

function SaleForm({ onSubmit, onCancel }: { onSubmit: (data: SaleFormValues) => void, onCancel: () => void }) {
  const { data: bikes } = useListBikes({ status: "in_stock" });
  const { data: customers } = useListCustomers();

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      customerId: 0,
      bikeId: 0,
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      amountPaid: 0,
      paymentMethod: "Cash",
      notes: "",
    },
  });

  const selectedBikeId = useWatch({ control: form.control, name: "bikeId" });
  const quantity = useWatch({ control: form.control, name: "quantity" }) || 1;
  const unitPrice = useWatch({ control: form.control, name: "unitPrice" }) || 0;
  const discount = useWatch({ control: form.control, name: "discount" }) || 0;
  
  const totalAmount = (quantity * unitPrice) - discount;

  // Auto-fill unit price when bike changes
  const handleBikeChange = (val: string) => {
    const id = parseInt(val, 10);
    form.setValue("bikeId", id);
    const bike = bikes?.find(b => b.id === id);
    if (bike) {
      form.setValue("unitPrice", bike.salePrice);
      // Auto set amount paid to full price by default
      const currTotal = (quantity * bike.salePrice) - discount;
      form.setValue("amountPaid", currTotal);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="customerId"
            render={({ field }) => (
              <FormItem className="col-span-2 sm:col-span-1">
                <FormLabel>Customer</FormLabel>
                <Select onValueChange={(val) => field.onChange(parseInt(val, 10))} value={field.value ? field.value.toString() : ""}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select a customer" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {customers?.map(c => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.fullName} ({c.phone})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="bikeId"
            render={({ field }) => (
              <FormItem className="col-span-2 sm:col-span-1">
                <FormLabel>Bike</FormLabel>
                <Select onValueChange={handleBikeChange} value={field.value ? field.value.toString() : ""}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select a bike" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {bikes?.map(b => (
                      <SelectItem key={b.id} value={b.id.toString()}>{b.brand} {b.name} - {formatPKR(b.salePrice)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantity</FormLabel>
                <FormControl><Input type="number" min={1} {...field} onChange={e => {
                  field.onChange(e);
                  const q = parseInt(e.target.value) || 1;
                  form.setValue("amountPaid", (q * unitPrice) - discount);
                }}/></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="unitPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit Price</FormLabel>
                <FormControl><Input type="number" {...field} onChange={e => {
                  field.onChange(e);
                  const p = parseInt(e.target.value) || 0;
                  form.setValue("amountPaid", (quantity * p) - discount);
                }}/></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="discount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Discount</FormLabel>
                <FormControl><Input type="number" {...field} onChange={e => {
                  field.onChange(e);
                  const d = parseInt(e.target.value) || 0;
                  form.setValue("amountPaid", Math.max(0, (quantity * unitPrice) - d));
                }}/></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="col-span-2 bg-muted p-4 rounded-md my-2 flex justify-between items-center">
            <span className="font-medium">Total Amount:</span>
            <span className="text-xl font-bold">{formatPKR(totalAmount > 0 ? totalAmount : 0)}</span>
          </div>

          <FormField
            control={form.control}
            name="amountPaid"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount Paid Now</FormLabel>
                <FormControl><Input type="number" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="paymentMethod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Method</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Credit Card">Credit Card</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Notes (Optional)</FormLabel>
                <FormControl><Input placeholder="Any additional notes for the receipt..." {...field} value={field.value || ""} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit">Complete Sale</Button>
        </div>
      </form>
    </Form>
  );
}

export default function SalesList() {
  const [search, setSearch] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<string>("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [, setLocation] = useLocation();
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const statusFilter = paymentStatus !== "all" ? paymentStatus as ListSalesPaymentStatus : undefined;
  
  const { data: sales, isLoading } = useListSales(
    { search: search || undefined, paymentStatus: statusFilter }, 
    { query: { queryKey: getListSalesQueryKey({ search: search || undefined, paymentStatus: statusFilter }) } }
  );

  const createMutation = useCreateSale();

  const handleCreate = (data: SaleFormValues) => {
    createMutation.mutate({ data }, {
      onSuccess: (res) => {
        queryClient.invalidateQueries();
        setIsAddOpen(false);
        toast({ title: "Success", description: "Sale recorded successfully" });
        setLocation(`/sales/${res.id}`); // Navigate to receipt
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message || "Failed to record sale", variant: "destructive" });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Sales</h1>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> New Sale</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Record New Sale</DialogTitle>
              <DialogDescription>Create a new invoice. Stock will be automatically deducted.</DialogDescription>
            </DialogHeader>
            <SaleForm onSubmit={handleCreate} onCancel={() => setIsAddOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search invoice or customer..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={paymentStatus} onValueChange={setPaymentStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Payment Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="paid">Fully Paid</SelectItem>
            <SelectItem value="partial">Partially Paid</SelectItem>
            <SelectItem value="unpaid">Unpaid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Status</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">Loading...</TableCell>
              </TableRow>
            ) : sales?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <ReceiptText className="h-8 w-8 mb-2 opacity-20" />
                    <p>No sales records found.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              sales?.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell>
                    <Link href={`/sales/${sale.id}`} className="font-mono font-medium hover:underline text-primary">
                      {sale.invoiceNo}
                    </Link>
                  </TableCell>
                  <TableCell>{formatDate(sale.createdAt)}</TableCell>
                  <TableCell>
                    <Link href={`/customers/${sale.customerId}`} className="hover:underline">
                      {sale.customer?.fullName}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {sale.bike?.brand} {sale.bike?.name} x{sale.quantity}
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatPKR(sale.totalAmount)}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={
                      sale.paymentStatus === 'paid' ? 'default' : 
                      sale.paymentStatus === 'partial' ? 'secondary' : 'destructive'
                    }>
                      {sale.paymentStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <Link href={`/sales/${sale.id}`} className="cursor-pointer w-full flex">
                            View invoice <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
