import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, ScanLine, History, BarChart3, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { url: "/", icon: LayoutDashboard, label: "Home" },
  { url: "/scan", icon: ScanLine, label: "Scan" },
  { url: "/history", icon: History, label: "History" },
  { url: "/analytics", icon: BarChart3, label: "Stats" },
  { url: "/settings", icon: Settings, label: "Settings" },
] as const;

export function MobileNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="glass-panel fixed inset-x-3 bottom-3 z-40 flex items-center justify-around rounded-2xl border border-white/10 px-2 py-2 md:hidden">
      {nav.map((n) => {
        const active = pathname === n.url;
        return (
          <Link
            key={n.url}
            to={n.url}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-medium transition-all",
              active ? "text-white" : "text-muted-foreground",
            )}
          >
            <div className={cn("grid h-8 w-8 place-items-center rounded-lg transition-all", active && "gradient-primary glow-primary")}>
              <n.icon className="h-4 w-4" />
            </div>
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
