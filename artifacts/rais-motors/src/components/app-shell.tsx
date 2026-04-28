import { type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useGetCurrentUser, useLogout } from "@workspace/api-client-react";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "./ui/sheet";
import { LogOut, Menu, Bike, Users, LayoutDashboard, ReceiptText, Settings, User, Wallet, Receipt, PackagePlus, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { useQueryClient } from "@tanstack/react-query";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inventory", label: "Inventory", icon: Bike },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/sales", label: "Sales", icon: ReceiptText },
  { href: "/purchases", label: "Purchases", icon: PackagePlus },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/banks", label: "Banks", icon: Wallet },
  { href: "/profit", label: "Profit", icon: TrendingUp },
  { href: "/settings", label: "Settings", icon: Settings },
];

function NavLinks({ isMobile = false, onClick }: { isMobile?: boolean, onClick?: () => void }) {
  const [location] = useLocation();

  return (
    <nav className="flex flex-col gap-2">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
        
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClick}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive 
                ? "bg-primary text-primary-foreground" 
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { data: user } = useGetCurrentUser();
  const logout = useLogout();
  const queryClient = useQueryClient();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries();
      }
    });
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-64 flex-col border-r bg-background sm:flex">
        <div className="flex h-14 items-center border-b px-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <span className="text-primary">Rais</span> Motors
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto py-4 px-4">
          <NavLinks />
        </div>
      </aside>

      <div className="flex flex-col sm:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-14 sm:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" variant="outline" className="sm:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 sm:max-w-none">
              <SheetTitle className="text-left flex items-center gap-2 font-bold mb-6">
                <span className="text-primary">Rais</span> Motors
              </SheetTitle>
              <SheetDescription className="sr-only">Navigation Menu</SheetDescription>
              <NavLinks isMobile onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))} />
            </SheetContent>
          </Sheet>

          <div className="flex-1 flex justify-end gap-4 items-center">
            <ThemeToggle />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/20 text-primary">
                      {user?.fullName?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.fullName}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user?.username}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="w-full cursor-pointer flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
