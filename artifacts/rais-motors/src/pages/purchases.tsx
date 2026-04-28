import { useState, useMemo } from "react";
import {
  useListPurchaseOrders,
  useCreatePurchaseOrder,
  useReceivePurchaseOrder,
  useDeletePurchaseOrder,
  useListBikes,
  useListBanks,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatPKR } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, PackagePlus, Trash2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function PurchaseForm({ onSubmit, onCancel }: { onSubmit: (v: any) => void; onCancel: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: bikes } = useListBikes({});
  const { data: banks } = useListBanks();
  const [supplierName, setSupplierName] = useState("");
  const [bikeId, setBikeId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState("");
  const [orderDate, setOrderDate] = useState(today);
  const [bankId, setBankId] = useState("");
  const [status, setStatus] = useState("received");
  const [notes, setNotes] = useState("");

  const total = useMemo(() => (Number(quantity) || 0) * (Number(unitCost) || 0), [quantity, unitCost]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!supplierName.trim() || !bikeId || !quantity || !unitCost) return;
        onSubmit({
          supplierName: supplierName.trim(),
          bikeId: Number(bikeId),
          quantity: Number(quantity),
          unitCost: Number(unitCost),
          orderDate,
          bankId: bankId && bankId !== "none" ? Number(bankId) : undefined,
          status,
          notes: notes || undefined,
        });
      }}
      className="space-y-3"
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label>Supplier Name</Label><Input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} /></div>
        <div className="space-y-1"><Label>Order Date</Label><Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} /></div>
      </div>
      <div className="space-y-1">
        <Label>Bike</Label>
        <Select value={bikeId} onValueChange={setBikeId}>
          <SelectTrigger><SelectValue placeholder="Select a bike" /></SelectTrigger>
          <SelectContent>{bikes?.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.brand} {b.name} ({b.sku})</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1"><Label>Quantity</Label><Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></div>
        <div className="space-y-1"><Label>Unit Cost (Rs)</Label><Input type="number" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} /></div>
        <div className="space-y-1"><Label>Total</Label><div className="h-9 flex items-center px-3 border rounded-md bg-muted/40 font-semibold">{formatPKR(total)}</div></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="received">Received (add to stock)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Pay From Bank (optional)</Label>
          <Select value={bankId} onValueChange={setBankId}>
            <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {banks?.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1"><Label>Notes</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Create Order</Button>
      </DialogFooter>
    </form>
  );
}

export default function PurchasesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: orders, isLoading } = useListPurchaseOrders();
  const createMut = useCreatePurchaseOrder();
  const receiveMut = useReceivePurchaseOrder();
  const deleteMut = useDeletePurchaseOrder();
  const [isAddOpen, setIsAddOpen] = useState(false);

  const handleCreate = (data: any) => {
    createMut.mutate({ data }, {
      onSuccess: () => { queryClient.invalidateQueries(); setIsAddOpen(false); toast({ title: "Purchase order created" }); },
      onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };
  const handleReceive = (id: number) => {
    receiveMut.mutate({ id }, { onSuccess: () => { queryClient.invalidateQueries(); toast({ title: "Stock updated" }); } });
  };
  const handleDelete = (id: number) => {
    if (!confirm("Delete this purchase order?")) return;
    deleteMut.mutate({ id }, { onSuccess: () => { queryClient.invalidateQueries(); toast({ title: "Order deleted" }); } });
  };

  const totalSpent = orders?.reduce((s, o) => s + o.totalCost, 0) ?? 0;
  const pendingCount = orders?.filter(o => o.status === "pending").length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Purchase Orders</h1>
          <p className="text-muted-foreground">Track inventory restocks from suppliers.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> New Purchase</Button></DialogTrigger>
          <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New Purchase Order</DialogTitle>
              <DialogDescription>Order bikes from a supplier and optionally add to stock immediately.</DialogDescription>
            </DialogHeader>
            <PurchaseForm onSubmit={handleCreate} onCancel={() => setIsAddOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total Orders</p><p className="text-2xl font-bold">{orders?.length ?? 0}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Pending</p><p className="text-2xl font-bold">{pendingCount}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total Spent</p><p className="text-2xl font-bold">{formatPKR(totalSpent)}</p></CardContent></Card>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Bike</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Unit Cost</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[120px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9} className="h-24 text-center">Loading...</TableCell></TableRow>
            ) : orders?.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="h-24 text-center"><div className="flex flex-col items-center text-muted-foreground"><PackagePlus className="h-8 w-8 opacity-20 mb-2" />No purchase orders yet.</div></TableCell></TableRow>
            ) : orders?.map(o => (
              <TableRow key={o.id}>
                <TableCell className="font-mono text-xs">{o.orderNo}</TableCell>
                <TableCell className="text-sm">{o.orderDate}</TableCell>
                <TableCell>{o.supplierName}</TableCell>
                <TableCell>{o.bikeName}</TableCell>
                <TableCell className="text-right">{o.quantity}</TableCell>
                <TableCell className="text-right">{formatPKR(o.unitCost)}</TableCell>
                <TableCell className="text-right font-semibold">{formatPKR(o.totalCost)}</TableCell>
                <TableCell>
                  <Badge variant={o.status === "received" ? "default" : "secondary"}>
                    {o.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 justify-end">
                    {o.status !== "received" && (
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600" title="Mark received & add to stock" onClick={() => handleReceive(o.id)}><CheckCircle2 className="h-4 w-4" /></Button>
                    )}
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(o.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
