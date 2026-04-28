import { useState } from "react";
import {
  useListExpenses,
  useGetExpenseSummary,
  useCreateExpense,
  useDeleteExpense,
  useListBanks,
  type Expense,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatPKR } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, Receipt, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = ["General", "Salaries", "Rent", "Utilities", "Maintenance", "Marketing", "Travel", "Office", "Other"];

function ExpenseForm({ onSubmit, onCancel }: { onSubmit: (v: any) => void; onCancel: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [expenseDate, setExpenseDate] = useState(today);
  const [category, setCategory] = useState("General");
  const [description, setDescription] = useState("");
  const [paidTo, setPaidTo] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [bankId, setBankId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const { data: banks } = useListBanks();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!description.trim() || !amount) return;
        onSubmit({
          expenseDate,
          category,
          description: description.trim(),
          paidTo: paidTo || undefined,
          amount: Number(amount),
          paymentMethod,
          bankId: bankId ? Number(bankId) : undefined,
          notes: notes || undefined,
        });
      }}
      className="space-y-3"
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label>Date</Label><Input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} /></div>
        <div className="space-y-1">
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1"><Label>Description</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What was this expense for?" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label>Paid To</Label><Input value={paidTo} onChange={(e) => setPaidTo(e.target.value)} /></div>
        <div className="space-y-1"><Label>Amount (Rs)</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Payment Method</Label>
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="bank">Bank</SelectItem>
              <SelectItem value="cheque">Cheque</SelectItem>
              <SelectItem value="online">Online</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Bank Account (optional)</Label>
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
        <Button type="submit">Add Expense</Button>
      </DialogFooter>
    </form>
  );
}

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: expenses, isLoading } = useListExpenses();
  const { data: summary } = useGetExpenseSummary();
  const createMut = useCreateExpense();
  const deleteMut = useDeleteExpense();
  const [isAddOpen, setIsAddOpen] = useState(false);

  const handleCreate = (data: any) => {
    const { bankId, ...rest } = data;
    createMut.mutate({ data: { ...rest, bankId: bankId === undefined ? undefined : (bankId === "none" ? undefined : bankId) } }, {
      onSuccess: () => {
        queryClient.invalidateQueries();
        setIsAddOpen(false);
        toast({ title: "Expense recorded" });
      },
      onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this expense?")) return;
    deleteMut.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries();
        toast({ title: "Expense deleted" });
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Record Expense</Button></DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Record New Expense</DialogTitle>
              <DialogDescription>Track day-to-day business outflows.</DialogDescription>
            </DialogHeader>
            <ExpenseForm onSubmit={handleCreate} onCancel={() => setIsAddOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{formatPKR(summary?.month ?? 0)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">This Year</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{formatPKR(summary?.year ?? 0)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">All Time</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{formatPKR(summary?.total ?? 0)}</div></CardContent></Card>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Paid To</TableHead>
              <TableHead>Method</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="h-24 text-center">Loading...</TableCell></TableRow>
            ) : expenses?.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="h-24 text-center"><div className="flex flex-col items-center text-muted-foreground"><Receipt className="h-8 w-8 opacity-20 mb-2" />No expenses recorded.</div></TableCell></TableRow>
            ) : expenses?.map((e: Expense) => (
              <TableRow key={e.id}>
                <TableCell className="text-sm">{e.expenseDate}</TableCell>
                <TableCell><Badge variant="outline">{e.category}</Badge></TableCell>
                <TableCell className="font-medium">{e.description}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{e.paidTo || "—"}</TableCell>
                <TableCell className="text-sm">{e.bankName ? `${e.paymentMethod} (${e.bankName})` : e.paymentMethod}</TableCell>
                <TableCell className="text-right font-semibold text-red-600">{formatPKR(e.amount)}</TableCell>
                <TableCell><Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(e.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
