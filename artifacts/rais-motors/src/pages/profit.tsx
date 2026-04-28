import { useState } from "react";
import { useGetProfit, GetProfitPeriod } from "@workspace/api-client-react";
import { formatPKR } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, DollarSign, Receipt, ShoppingCart } from "lucide-react";

const PERIODS = [
  { value: "daily", label: "Today" },
  { value: "weekly", label: "Last 7 Days" },
  { value: "monthly", label: "This Month" },
  { value: "yearly", label: "This Year" },
  { value: "all", label: "All Time" },
];

export default function ProfitPage() {
  const [period, setPeriod] = useState<GetProfitPeriod>(GetProfitPeriod.monthly);
  const { data, isLoading } = useGetProfit({ period });

  const isProfit = (data?.netProfit ?? 0) >= 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profit Count</h1>
          <p className="text-muted-foreground">Revenue minus cost of goods and operational expenses.</p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as GetProfitPeriod)}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>{PERIODS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Calculating...</p>
      ) : (
        <>
          <Card className={`border-2 ${isProfit ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"}`}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="text-base font-medium text-muted-foreground">Net Profit ({data?.label})</span>
                {isProfit ? <TrendingUp className="h-5 w-5 text-emerald-600" /> : <TrendingDown className="h-5 w-5 text-red-600" />}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-4xl font-bold ${isProfit ? "text-emerald-600" : "text-red-600"}`}>{formatPKR(data?.netProfit ?? 0)}</div>
              <p className="text-sm text-muted-foreground mt-1">Gross margin: {data?.margin ?? 0}%</p>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><DollarSign className="h-4 w-4" />Revenue</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{formatPKR(data?.revenue ?? 0)}</div><p className="text-xs text-muted-foreground">{data?.sales ?? 0} sales</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><ShoppingCart className="h-4 w-4" />Cost of Goods</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{formatPKR(data?.cost ?? 0)}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Gross Profit</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-emerald-600">{formatPKR(data?.grossProfit ?? 0)}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Receipt className="h-4 w-4" />Expenses</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-red-600">{formatPKR(data?.expenses ?? 0)}</div></CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">How this is calculated</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex justify-between"><span className="text-muted-foreground">Sales Revenue</span><span className="font-medium">{formatPKR(data?.revenue ?? 0)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">− Cost of Goods (purchase price × qty)</span><span className="font-medium">−{formatPKR(data?.cost ?? 0)}</span></div>
              <div className="flex justify-between border-t pt-2"><span>= Gross Profit</span><span className="font-semibold text-emerald-600">{formatPKR(data?.grossProfit ?? 0)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">− Operating Expenses</span><span className="font-medium">−{formatPKR(data?.expenses ?? 0)}</span></div>
              <div className="flex justify-between border-t pt-2 text-lg"><span className="font-semibold">= Net Profit</span><span className={`font-bold ${isProfit ? "text-emerald-600" : "text-red-600"}`}>{formatPKR(data?.netProfit ?? 0)}</span></div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
