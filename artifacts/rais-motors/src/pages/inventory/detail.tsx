import { useParams } from "wouter";
import { useGetBike, useListSales, getGetBikeQueryKey, getListSalesQueryKey } from "@workspace/api-client-react";
import { formatPKR, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Bike as BikeIcon, Hash, Tag, Info, ReceiptText } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function InventoryDetail() {
  const { id } = useParams();
  const bikeId = parseInt(id || "0", 10);

  const { data: bike, isLoading: loadingBike } = useGetBike(bikeId, {
    query: { enabled: !!bikeId, queryKey: getGetBikeQueryKey(bikeId) },
  });
  const { data: sales, isLoading: loadingSales } = useListSales(undefined, {
    query: { queryKey: getListSalesQueryKey() },
  });

  if (loadingBike || loadingSales) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!bike) return <div>Bike not found</div>;

  const bikeSales = sales?.filter(s => s.bikeId === bikeId) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/inventory">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{bike.brand} {bike.name}</h1>
          <p className="text-muted-foreground">{bike.model} &bull; {bike.category}</p>
        </div>
        <div className="ml-auto">
          <Badge variant={
            bike.stock === 0 ? "destructive" : 
            bike.stock <= (bike.lowStockThreshold || 2) ? "secondary" : "default"
          } className="text-sm px-3 py-1">
            {bike.stock} in stock
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6 text-sm">
              <div>
                <dt className="text-muted-foreground flex items-center gap-2 mb-1"><Hash className="h-4 w-4"/> SKU</dt>
                <dd className="font-mono bg-muted inline-block px-2 py-1 rounded">{bike.sku}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground flex items-center gap-2 mb-1"><Tag className="h-4 w-4"/> Brand & Model</dt>
                <dd className="font-medium">{bike.brand} {bike.name} ({bike.model})</dd>
              </div>
              <div>
                <dt className="text-muted-foreground flex items-center gap-2 mb-1"><BikeIcon className="h-4 w-4"/> Category & Color</dt>
                <dd className="font-medium">{bike.category} &bull; {bike.color || "N/A"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground flex items-center gap-2 mb-1"><Info className="h-4 w-4"/> Engine</dt>
                <dd className="font-medium">{bike.engineCc ? `${bike.engineCc} CC` : "N/A"}</dd>
              </div>
              {bike.notes && (
                <div className="sm:col-span-2 pt-4 border-t">
                  <dt className="text-muted-foreground mb-1">Notes</dt>
                  <dd className="text-sm">{bike.notes}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pricing & Stock</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Sale Price</p>
              <p className="text-3xl font-bold text-primary">{formatPKR(bike.salePrice)}</p>
            </div>
            {bike.purchasePrice && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Purchase Price</p>
                <p className="text-xl font-medium">{formatPKR(bike.purchasePrice)}</p>
              </div>
            )}
            <div className="pt-4 border-t">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">Current Stock</span>
                <span className="font-bold">{bike.stock} units</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Low Stock Alert At</span>
                <span className="font-medium">{bike.lowStockThreshold || 2} units</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ReceiptText className="h-5 w-5" />
            Sales History
          </CardTitle>
          <CardDescription>Recent sales involving this model</CardDescription>
        </CardHeader>
        <CardContent>
          {bikeSales.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No sales recorded for this bike yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bikeSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>{formatDate(sale.createdAt)}</TableCell>
                    <TableCell>
                      <Link href={`/sales/${sale.id}`} className="font-mono text-primary hover:underline">
                        {sale.invoiceNo}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/customers/${sale.customer.id}`} className="hover:underline">
                        {sale.customer.fullName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">{sale.quantity}</TableCell>
                    <TableCell className="text-right font-medium">{formatPKR(sale.totalAmount)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={
                        sale.paymentStatus === 'paid' ? 'default' : 
                        sale.paymentStatus === 'partial' ? 'secondary' : 'destructive'
                      }>
                        {sale.paymentStatus}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
