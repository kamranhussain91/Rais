import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AppShell } from "@/components/app-shell";
import { useGetCurrentUser, getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";

import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import InventoryList from "@/pages/inventory/index";
import InventoryDetail from "@/pages/inventory/detail";
import CustomersList from "@/pages/customers/index";
import CustomerDetail from "@/pages/customers/detail";
import SalesList from "@/pages/sales/index";
import SaleDetail from "@/pages/sales/detail";
import Settings from "@/pages/settings";
import BanksPage from "@/pages/banks";
import ExpensesPage from "@/pages/expenses";
import PurchasesPage from "@/pages/purchases";
import ProfitPage from "@/pages/profit";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function AppRouter() {
  const { data: user, isLoading, error } = useGetCurrentUser({
    query: { retry: false, queryKey: getGetCurrentUserQueryKey() },
  });
  const [location, setLocation] = useLocation();
  const isAuthed = !!user && !error;

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthed && location !== "/login") {
      setLocation("/login");
    } else if (isAuthed && location === "/login") {
      setLocation("/");
    }
  }, [isAuthed, isLoading, location, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthed) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route>
          <div className="min-h-screen w-full flex items-center justify-center bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </Route>
      </Switch>
    );
  }

  return (
    <AppShell>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/inventory" component={InventoryList} />
        <Route path="/inventory/:id" component={InventoryDetail} />
        <Route path="/customers" component={CustomersList} />
        <Route path="/customers/:id" component={CustomerDetail} />
        <Route path="/sales" component={SalesList} />
        <Route path="/sales/:id" component={SaleDetail} />
        <Route path="/banks" component={BanksPage} />
        <Route path="/expenses" component={ExpensesPage} />
        <Route path="/purchases" component={PurchasesPage} />
        <Route path="/profit" component={ProfitPage} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </AppShell>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="rais-motors-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AppRouter />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
