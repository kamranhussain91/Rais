import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useGetDashboardSummary,
  useGetMonthlyRevenue,
  useGetWeeklySales,
  useGetBestSellers,
  useGetRecentSales,
  useGetPendingPayments,
  useGetPeriodStats,
  useGetProfit,
  useListBikes,
  GetPeriodStatsPeriod,
} from "@workspace/api-client-react";
import { formatPKR, formatDate } from "@/lib/format";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import {
  Banknote,
  Bike,
  Loader2,
  PackageOpen,
  ReceiptText,
  Users,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type PeriodKey = (typeof GetPeriodStatsPeriod)[keyof typeof GetPeriodStatsPeriod];

const PERIOD_OPTIONS: Array<{ value: PeriodKey; label: string }> = [
  { value: GetPeriodStatsPeriod.daily, label: "Today" },
  { value: GetPeriodStatsPeriod.weekly, label: "Last 7 Days" },
  { value: GetPeriodStatsPeriod.monthly, label: "This Month" },
  { value: GetPeriodStatsPeriod.yearly, label: "This Year" },
  { value: GetPeriodStatsPeriod.all, label: "All Time" },
];

export default function Dashboard() {
  const [period, setPeriod] = useState<PeriodKey>(GetPeriodStatsPeriod.all);

  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary();
  const { data: monthlyData, isLoading: loadingMonthly } = useGetMonthlyRevenue();
  const { data: weeklyData, isLoading: loadingWeekly } = useGetWeeklySales();
  const { data: bestSellers } = useGetBestSellers();
  const { data: recentSales, isLoading: loadingRecent } = useGetRecentSales();
  const { data: pendingPayments, isLoading: loadingPending } = useGetPendingPayments();
  const { data: periodStats, isLoading: loadingPeriod } = useGetPeriodStats({ period });
  const { data: profitData } = useGetProfit({ period });
  const { data: bikes } = useListBikes({});

  if (
    loadingSummary ||
    loadingMonthly ||
    loadingWeekly ||
    loadingRecent ||
    loadingPending
  ) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Overview of showroom performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select
            value={period}
            onValueChange={(v) => setPeriod(v as PeriodKey)}
          >
            <SelectTrigger className="w-[180px]" data-testid="select-period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue ({periodStats?.label ?? "..."})</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingPeriod || !periodStats ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-bold" data-testid="text-period-revenue">{formatPKR(periodStats.revenue)}</div>
                <p className="text-xs text-muted-foreground">{formatPKR(periodStats.total)} billed</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sales ({periodStats?.label ?? "..."})</CardTitle>
            <ReceiptText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingPeriod || !periodStats ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-bold" data-testid="text-period-sales">{periodStats.sales}</div>
                <p className="text-xs text-muted-foreground">Avg {formatPKR(periodStats.averageSale)} / sale</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers ({periodStats?.label ?? "..."})</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingPeriod || !periodStats ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-bold">{periodStats.uniqueCustomers}</div>
                <p className="text-xs text-muted-foreground">Unique buyers in period</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card className={profitData && profitData.netProfit >= 0 ? "border-emerald-500/30" : "border-red-500/30"}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit ({profitData?.label ?? "..."})</CardTitle>
            <TrendingUp className={`h-4 w-4 ${profitData && profitData.netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${profitData && profitData.netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatPKR(profitData?.netProfit ?? 0)}</div>
            <p className="text-xs text-muted-foreground">Margin {profitData?.margin ?? 0}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatPKR(summary.pendingPayments)}</div>
            <p className="text-xs text-muted-foreground">Outstanding balances</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <Bike className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Bikes</p>
              <h3 className="text-xl font-bold">{summary.totalBikes} Models</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <PackageOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Stock</p>
              <h3 className="text-xl font-bold">{summary.totalStock} Units</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Customers</p>
              <h3 className="text-xl font-bold">{summary.totalCustomers} Active</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="bg-destructive/10 p-3 rounded-full">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Low Stock</p>
              <h3 className="text-xl font-bold text-destructive">{summary.lowStockCount} Alerts</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {bikes && bikes.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Inventory at a Glance</CardTitle>
              <CardDescription>Live stock for every bike model</CardDescription>
            </div>
            <Link href="/inventory">
              <Button variant="outline" size="sm">Manage <ArrowRight className="ml-1 h-3 w-3" /></Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {bikes.slice(0, 10).map((b) => {
                const status = b.stock === 0 ? "out" : b.stock <= (b.lowStockThreshold || 2) ? "low" : "in";
                return (
                  <Link key={b.id} href={`/inventory/${b.id}`} className="group">
                    <div className="rounded-md border bg-card p-3 hover:border-primary/50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground truncate">{b.brand}</p>
                          <p className="font-medium truncate group-hover:text-primary">{b.name}</p>
                        </div>
                        <Badge variant={status === "out" ? "destructive" : status === "low" ? "secondary" : "outline"} className="text-[10px] shrink-0">
                          {status === "out" ? "Out" : status === "low" ? "Low" : "In"}
                        </Badge>
                      </div>
                      <div className="mt-2 flex items-end justify-between">
                        <span className="text-xs text-muted-foreground font-mono">{b.sku}</span>
                        <span className="text-lg font-bold leading-none">{b.stock}<span className="text-xs font-normal text-muted-foreground ml-0.5">in stock</span></span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{formatPKR(b.salePrice)}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
            {bikes.length > 10 && (
              <p className="mt-3 text-xs text-center text-muted-foreground">Showing 10 of {bikes.length} bikes</p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-7">
        <Card className="col-span-7 lg:col-span-4">
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
            <CardDescription>Monthly revenue (last 12 months)</CardDescription>
          </CardHeader>
          <CardContent className="px-2">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `Rs ${Math.round(value / 1000)}k`}
                  />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                    formatter={(value: number) => [formatPKR(value), "Revenue"]}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-7 lg:col-span-3">
          <CardHeader>
            <CardTitle>Weekly Sales</CardTitle>
            <CardDescription>Sales volume for the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { weekday: 'short' })}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    labelFormatter={(val) => formatDate(val)}
                  />
                  <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {bestSellers && bestSellers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Best Selling Bikes</CardTitle>
            <CardDescription>Top models ranked by units sold (lifetime)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 lg:grid-cols-5">
              <div className="lg:col-span-3">
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={bestSellers.map((b) => ({
                        label: b.name,
                        brand: b.brand,
                        units: b.unitsSold,
                        revenue: b.revenue,
                      }))}
                      layout="vertical"
                      margin={{ top: 5, right: 24, left: 8, bottom: 5 }}
                      barCategoryGap={12}
                    >
                      <defs>
                        <linearGradient id="bestSellerGradient" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.55} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                      <XAxis
                        type="number"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="label"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        width={130}
                      />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                        cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                        formatter={(value: number, name: string, item: any) => {
                          if (name === 'units') {
                            return [`${value} units · ${formatPKR(item.payload.revenue)}`, item.payload.brand];
                          }
                          return [value, name];
                        }}
                      />
                      <Bar
                        dataKey="units"
                        fill="url(#bestSellerGradient)"
                        radius={[0, 6, 6, 0]}
                        label={{ position: 'right', fill: 'hsl(var(--foreground))', fontSize: 12, fontWeight: 600 }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="space-y-2 lg:col-span-2">
                {bestSellers.map((b, idx) => {
                  const max = Math.max(...bestSellers.map((x) => x.unitsSold));
                  const pct = max > 0 ? Math.round((b.unitsSold / max) * 100) : 0;
                  return (
                    <div key={b.bikeId} className="rounded-md border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge variant={idx === 0 ? "default" : "secondary"} className="shrink-0 text-[10px]">
                            #{idx + 1}
                          </Badge>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{b.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{b.brand}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold">{b.unitsSold}</p>
                          <p className="text-[10px] text-muted-foreground">units</p>
                        </div>
                      </div>
                      <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground text-right">{formatPKR(b.revenue)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Sales</CardTitle>
              <CardDescription>Latest transactions</CardDescription>
            </div>
            <Link href="/sales">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentSales?.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center gap-4">
                    <div className="bg-muted p-2 rounded-full hidden sm:block">
                      <ReceiptText className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{sale.customer?.fullName || 'Unknown Customer'}</p>
                      <p className="text-xs text-muted-foreground">{sale.bike?.name} &bull; {formatDate(sale.createdAt)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{formatPKR(sale.totalAmount)}</p>
                    <Badge variant={
                      sale.paymentStatus === 'paid' ? 'default' :
                      sale.paymentStatus === 'partial' ? 'secondary' : 'destructive'
                    } className="mt-1 text-[10px] leading-none">
                      {sale.paymentStatus}
                    </Badge>
                  </div>
                </div>
              ))}
              {(!recentSales || recentSales.length === 0) && (
                <div className="text-center py-6 text-muted-foreground text-sm">No recent sales.</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending Payments</CardTitle>
            <CardDescription>Customers with outstanding balances</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingPayments?.slice(0, 8).map((payment) => (
                <div key={payment.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium">{payment.customer?.fullName}</p>
                    <p className="text-xs text-muted-foreground">Invoice #{payment.invoiceNo}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-bold text-destructive">{formatPKR(payment.amountDue)} due</p>
                      <p className="text-xs text-muted-foreground">{formatPKR(payment.totalAmount)} total</p>
                    </div>
                    <Link href={`/sales/${payment.id}`}>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
              {(!pendingPayments || pendingPayments.length === 0) && (
                <div className="text-center py-6 text-muted-foreground text-sm">No pending payments.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
