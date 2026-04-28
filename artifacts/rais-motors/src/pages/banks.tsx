import { useState } from "react";
import {
  useListBanks,
  useCreateBank,
  useUpdateBank,
  useDeleteBank,
  useListBankTransactions,
  useCreateBankTransaction,
  type Bank,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatPKR } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Wallet, Pencil, Trash2, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function BankForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: Bank;
  onSubmit: (v: { name: string; accountNumber?: string; openingBalance: number; notes?: string }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [accountNumber, setAccountNumber] = useState(initial?.accountNumber ?? "");
  const [openingBalance, setOpeningBalance] = useState(String(initial?.openingBalance ?? 0));
  const [notes, setNotes] = useState(initial?.notes ?? "");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSubmit({
          name: name.trim(),
          accountNumber: accountNumber || undefined,
          openingBalance: Number(openingBalance) || 0,
          notes: notes || undefined,
        });
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label>Bank / Account Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. HBL Main Account" />
      </div>
      <div className="space-y-2">
        <Label>Account Number</Label>
        <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Opening Balance (Rs)</Label>
        <Input type="number" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{initial ? "Update" : "Add"} Bank</Button>
      </DialogFooter>
    </form>
  );
}

function TransactionDialog({ bank, open, onOpenChange }: { bank: Bank | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: transactions } = useListBankTransactions(bank?.id ?? 0, {
    query: { enabled: !!bank, queryKey: ["bank-transactions", bank?.id] },
  });
  const createTxn = useCreateBankTransaction();
  const [type, setType] = useState<"credit" | "debit">("credit");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const handleAdd = () => {
    if (!bank || !amount) return;
    createTxn.mutate(
      { id: bank.id, data: { type, amount: Number(amount), description } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries();
          setAmount("");
          setDescription("");
          toast({ title: "Transaction added" });
        },
        onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{bank?.name} — Ledger</DialogTitle>
          <DialogDescription>Current balance: {formatPKR(bank?.balance ?? 0)}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
          <div className="space-y-1">
            <Label className="text-xs">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as "credit" | "debit")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="credit">Credit (+)</SelectItem>
                <SelectItem value="debit">Debit (−)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Amount</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-1 md:col-span-1">
            <Label className="text-xs">Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <Button onClick={handleAdd} disabled={!amount}>Add</Button>
        </div>
        <div className="rounded-md border max-h-80 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions?.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="h-16 text-center text-muted-foreground">No transactions yet</TableCell></TableRow>
              ) : (
                transactions?.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-xs">{new Date(t.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={t.type === "credit" ? "default" : "secondary"} className="gap-1">
                        {t.type === "credit" ? <ArrowDownCircle className="h-3 w-3" /> : <ArrowUpCircle className="h-3 w-3" />}
                        {t.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{t.description}</TableCell>
                    <TableCell className={`text-right font-medium ${t.type === "credit" ? "text-emerald-600" : "text-red-600"}`}>
                      {t.type === "credit" ? "+" : "−"}{formatPKR(t.amount)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function BanksPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: banks, isLoading } = useListBanks();
  const createMut = useCreateBank();
  const updateMut = useUpdateBank();
  const deleteMut = useDeleteBank();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editing, setEditing] = useState<Bank | null>(null);
  const [ledgerBank, setLedgerBank] = useState<Bank | null>(null);

  const handleCreate = (data: { name: string; accountNumber?: string; openingBalance: number; notes?: string }) => {
    createMut.mutate({ data }, {
      onSuccess: () => {
        queryClient.invalidateQueries();
        setIsAddOpen(false);
        toast({ title: "Bank added" });
      },
      onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  const handleUpdate = (data: { name: string; accountNumber?: string; openingBalance: number; notes?: string }) => {
    if (!editing) return;
    updateMut.mutate({ id: editing.id, data }, {
      onSuccess: () => {
        queryClient.invalidateQueries();
        setEditing(null);
        toast({ title: "Bank updated" });
      },
    });
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this bank? All ledger entries will also be removed.")) return;
    deleteMut.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries();
        toast({ title: "Bank deleted" });
      },
    });
  };

  const totalBalance = banks?.reduce((sum, b) => sum + b.balance, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Banks & Cash</h1>
          <p className="text-muted-foreground">Total balance across all accounts: <span className="font-semibold text-foreground">{formatPKR(totalBalance)}</span></p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Add Bank</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Bank Account</DialogTitle>
              <DialogDescription>Track balances and movements per account.</DialogDescription>
            </DialogHeader>
            <BankForm onSubmit={handleCreate} onCancel={() => setIsAddOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : banks?.length === 0 ? (
        <Card><CardContent className="py-12 flex flex-col items-center text-muted-foreground">
          <Wallet className="h-10 w-10 opacity-30 mb-2" />
          <p>No bank accounts yet. Add one to start tracking transactions.</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {banks?.map((b) => (
            <Card key={b.id} className="hover-elevate">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-start gap-2">
                    <Wallet className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <CardTitle className="text-base">{b.name}</CardTitle>
                      {b.accountNumber && <CardDescription className="text-xs font-mono">{b.accountNumber}</CardDescription>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(b)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(b.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-3">{formatPKR(b.balance)}</div>
                <Button variant="outline" size="sm" className="w-full" onClick={() => setLedgerBank(b)}>View Ledger</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Bank</DialogTitle></DialogHeader>
          {editing && <BankForm initial={editing} onSubmit={handleUpdate} onCancel={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>

      <TransactionDialog bank={ledgerBank} open={!!ledgerBank} onOpenChange={(o) => !o && setLedgerBank(null)} />
    </div>
  );
}
