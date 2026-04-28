import { useState } from "react";
import { useGetCurrentUser, useLogout } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, User, Shield, Loader2, Download, Database, FileJson, FileSpreadsheet } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { data: user, isLoading } = useGetCurrentUser();
  const logout = useLogout();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries();
      }
    });
  };

  const baseUrl = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

  async function downloadFile(path: string, label: string, fallbackName: string) {
    try {
      setBusy(label);
      const res = await fetch(`${baseUrl}${path}`, { credentials: "include" });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") ?? "";
      const match = /filename="?([^";]+)"?/.exec(cd);
      const filename = match?.[1] ?? fallbackName;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Download started", description: filename });
    } catch (err) {
      toast({
        title: "Download failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Account Profile</CardTitle>
          <CardDescription>Manage your account settings and preferences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                {user.fullName.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold">{user.fullName}</h2>
              <div className="flex items-center text-sm text-muted-foreground mt-1 gap-4">
                <span className="flex items-center gap-1"><User className="h-3 w-3"/> {user.username}</span>
                <span className="flex items-center gap-1"><Shield className="h-3 w-3"/> {user.role}</span>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t flex justify-end">
            <Button variant="destructive" onClick={handleLogout} disabled={logout.isPending}>
              {logout.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Export & Reports</CardTitle>
          <CardDescription>
            Download a complete report of all customers, inventory, sales, and payments. The report includes a summary of totals (revenue, dues, stock).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <Button
              variant="secondary"
              className="justify-start"
              onClick={() => downloadFile("/api/export/report", "report", "rais-motors-report.json")}
              disabled={busy === "report"}
            >
              {busy === "report" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileJson className="mr-2 h-4 w-4" />}
              Full Report (JSON)
            </Button>
            <Button
              variant="secondary"
              className="justify-start"
              onClick={() => downloadFile("/api/export/csv?table=sales", "sales", "rais-motors-sales.csv")}
              disabled={busy === "sales"}
            >
              {busy === "sales" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
              Sales (CSV)
            </Button>
            <Button
              variant="secondary"
              className="justify-start"
              onClick={() => downloadFile("/api/export/csv?table=customers", "customers", "rais-motors-customers.csv")}
              disabled={busy === "customers"}
            >
              {busy === "customers" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
              Customers (CSV)
            </Button>
            <Button
              variant="secondary"
              className="justify-start"
              onClick={() => downloadFile("/api/export/csv?table=bikes", "bikes", "rais-motors-bikes.csv")}
              disabled={busy === "bikes"}
            >
              {busy === "bikes" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
              Inventory (CSV)
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Database Backup</CardTitle>
          <CardDescription>
            Download a SQL backup of all your data (customers, bikes, sales, payments). The filename includes the current date and time so you can keep multiple backups.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => downloadFile("/api/export/backup", "backup", "rais-motors-backup.sql")}
            disabled={busy === "backup"}
          >
            {busy === "backup" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
            Download Database Backup (.sql)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
