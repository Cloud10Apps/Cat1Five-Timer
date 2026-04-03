import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import logoSrc from "@/assets/logo.svg";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Users,
  Building,
  ArrowUpSquare,
  ClipboardCheck,
  Calendar,
  BarChart3,
  Settings,
  LogOut,
  ShieldAlert,
} from "lucide-react";
import { useAuth } from "./auth-provider";
import { Button } from "./ui/button";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Customers", href: "/customers", icon: Users },
    { name: "Buildings", href: "/buildings", icon: Building },
    { name: "Elevators", href: "/elevators", icon: ArrowUpSquare },
    { name: "Inspections", href: "/inspections", icon: ClipboardCheck },
    { name: "Calendar", href: "/calendar", icon: Calendar },
    { name: "Reports", href: "/reports", icon: BarChart3 },
  ];

  if (user?.role === "ADMIN") {
    navigation.push({ name: "Admin", href: "/admin", icon: ShieldAlert });
  }
  navigation.push({ name: "Settings", href: "/settings", icon: Settings });

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar className="border-r border-sidebar-border">
          <SidebarHeader className="p-4 border-b border-sidebar-border">
            <img src={logoSrc} alt="Cat1Five Timer" className="h-10 w-auto" />
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              {navigation.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.href}
                    tooltip={item.name}
                  >
                    <Link href={item.href} className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="border-t border-sidebar-border p-4">
            <div className="flex flex-col gap-2">
              <div className="flex flex-col">
                <span className="text-sm font-medium truncate text-sidebar-foreground">{user?.email}</span>
                <span className="text-xs text-zinc-400">{user?.role}</span>
              </div>
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 text-zinc-400 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                onClick={logout}
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex h-14 lg:h-[60px] items-center gap-4 border-b bg-card px-6">
            <SidebarTrigger />
            <div className="w-full flex-1"></div>
          </header>
          <main className="flex-1 overflow-y-auto p-6 bg-background">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
