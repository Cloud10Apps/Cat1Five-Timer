import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import logoSrc from "@/assets/logo.svg";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
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
  Settings,
  LogOut,
  ShieldAlert,
  CreditCard,
  Bell,
} from "lucide-react";
import { useAuth } from "./auth-provider";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [overdueCount, setOverdueCount] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch("/api/dashboard/attention", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : [])
      .then((data: any[]) => {
        setOverdueCount(data.filter((i: any) => i.status === "OVERDUE").length);
      })
      .catch(() => {});
  }, [location]);

  const mainNav = [
    { name: "Dashboard",   href: "/dashboard",   icon: LayoutDashboard },
    { name: "Customers",   href: "/customers",   icon: Users },
    { name: "Buildings",   href: "/buildings",   icon: Building },
    { name: "Current Inspections",  href: "/elevators",   icon: ArrowUpSquare },
    { name: "Inspection History",   href: "/inspections", icon: ClipboardCheck },
    { name: "Calendar",    href: "/calendar",    icon: Calendar },
  ];

  const bottomNav: { name: string; href: string; icon: typeof Settings }[] = [];
  if (user?.role === "ADMIN") {
    bottomNav.push({ name: "Admin",    href: "/admin",   icon: ShieldAlert as typeof Settings });
    bottomNav.push({ name: "Billing",  href: "/billing", icon: CreditCard as typeof Settings });
  }
  bottomNav.push({ name: "Settings", href: "/settings", icon: Settings });

  const NavItem = ({ name, href, icon: Icon }: { name: string; href: string; icon: typeof Settings }) => {
    const isActive = location === href;
    return (
      <Link
        href={href}
        className={cn(
          "group flex items-center gap-4 px-4 py-2.5 rounded-xl transition-all duration-150 select-none",
          isActive
            ? "bg-white text-zinc-950 shadow-[0_2px_12px_rgba(0,0,0,0.4)]"
            : "text-zinc-400 hover:text-white hover:bg-white/10"
        )}
      >
        <div className={cn(
          "flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-150 shrink-0",
          isActive
            ? "bg-zinc-950 text-white"
            : "bg-white/5 text-zinc-400 group-hover:bg-white/15 group-hover:text-white"
        )}>
          <Icon className="h-5 w-5" />
        </div>
        <span className={cn(
          "text-base font-semibold tracking-wide leading-none",
          isActive ? "text-zinc-950" : ""
        )}>
          {name}
        </span>
        {isActive && (
          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-zinc-950/40" />
        )}
      </Link>
    );
  };

  return (
    <SidebarProvider style={{ "--sidebar-width": "15rem" } as React.CSSProperties}>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar className="border-r border-white/5">
          {/* Logo — centered with symmetric padding */}
          <SidebarHeader className="pt-6 px-5 pb-5 border-b border-white/5">
            <img src={logoSrc} alt="Cat1Five Timer" className="w-full block" />
          </SidebarHeader>

          <SidebarContent className="px-3 py-3 flex flex-col gap-0 overflow-y-auto">
            {/* Section label */}
            <p className="px-3 mb-3 text-xs font-bold uppercase tracking-[0.15em] text-zinc-500">
              Navigation
            </p>

            {/* Main nav */}
            <nav className="flex flex-col gap-0.5">
              {mainNav.map((item) => (
                <NavItem key={item.href} {...item} />
              ))}
            </nav>

            {/* Divider */}
            <div className="my-3 border-t border-white/5" />

            {/* Bottom nav (Admin, Settings) */}
            <p className="px-3 mb-1 text-xs font-bold uppercase tracking-[0.15em] text-zinc-500">
              System
            </p>
            <nav className="flex flex-col gap-0.5">
              {bottomNav.map((item) => (
                <NavItem key={item.href} {...item} />
              ))}
            </nav>
          </SidebarContent>

          {/* Footer — user info + logout */}
          <SidebarFooter className="border-t border-white/5 px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/10 text-white shrink-0 font-bold text-base uppercase">
                {user?.email?.[0] ?? "?"}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-sm font-semibold truncate text-white leading-tight">{user?.email}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mt-0.5">{user?.role}</span>
              </div>
              <button
                onClick={logout}
                title="Logout"
                className="flex items-center justify-center w-9 h-9 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-colors shrink-0"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex h-12 items-center gap-4 border-b bg-card px-4">
            <SidebarTrigger />
            <div className="w-full flex-1" />
            {overdueCount > 0 && (
              <Link
                href="/elevators"
                className="relative flex items-center justify-center w-9 h-9 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                  {overdueCount > 99 ? "99+" : overdueCount}
                </span>
              </Link>
            )}
          </header>
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 bg-background">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
