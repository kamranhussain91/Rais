import { useParams } from "wouter";
import { useGetCustomer, getGetCustomerQueryKey } from "@workspace/api-client-react";
import { formatPKR, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, User, Phone, Mail, MapPin, CreditCard, ReceiptText } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function CustomerDetail() {
  const { id } = useParams();
  const customerId = parseInt(id || "0", 10);

  const { data: customer, isLoading } = useGetCustomer(customerId, {
    query: { enabled: !!customerId, queryKey: getGetCustomerQueryKey(customerId) },
  });

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!customer) return <div>Customer not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/customers">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customer Profile</h1>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader className="pb-4">
            <div className="flex flex-col items-center text-center space-y-3">
              <Avatar className="h-24 w-24 border-4 border-background shadow-sm">
                <AvatarFallback className="text-3xl bg-primary/10 text-primary">
                  {customer.fullName.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-xl">{customer.fullName}</CardTitle>
                <CardDescription>Customer since {formatDate(customer.createdAt)}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-start gap-3">
                <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Phone</p>
                  <p className="text-muted-foreground">{customer.phone}</p>
                </div>
              </div>
              {customer.email && (
                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">Email</p>
                    <p className="text-muted-foreground">{customer.email}</p>
                  </div>
                </div>
              )}
              {customer.cnic && (
                <div className="flex items-start gap-3">
                  <CreditCard className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">CNIC</p>
                    <p className="text-muted-foreground">{customer.cnic}</p>
                  </div>
                </div>
              )}
              {customer.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">Address</p>
                    <p className="text-muted-foreground">{customer.address}</p>
                  </div>
                </div>
              )}
              {customer.notes && (
                <div className="pt-4 mt-2 border-t text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Notes</p>
                  {customer.notes}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-2 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground mb-1">Total Spent</p>
                <h3 className="text-3xl font-bold">{formatPKR(customer.totalSpent)}</h3>
                <p className="text-xs text-muted-foreground mt-1">{customer.sales?.length || 0} total purchases</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground mb-1">Total Due</p>
                <h3 className="text-3xl font-bold text-destructive">{formatPKR(customer.totalDue)}</h3>
                <p className="text-xs text-muted-foreground mt-1">Requires follow-up</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ReceiptText className="h-5 w-5" />
                Purchase History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!customer.sales || customer.sales.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No purchases recorded yet.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Due</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customer.sales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell>{formatDate(sale.createdAt)}</TableCell>
                        <TableCell>
                          <Link href={`/sales/${sale.id}`} className="font-mono text-primary hover:underline">
                            {sale.invoiceNo}
                          </Link>
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate">
                          {sale.bike.brand} {sale.bike.name}
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatPKR(sale.totalAmount)}</TableCell>
                        <TableCell className="text-right text-destructive">
                          {sale.amountDue > 0 ? formatPKR(sale.amountDue) : "-"}
                        </TableCell>
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
      </div>
    </div>
  );
}
