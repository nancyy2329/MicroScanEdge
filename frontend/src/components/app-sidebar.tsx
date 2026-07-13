import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  ScanLine,
  History,
  BarChart3,
  FileText,
  Settings,
  Droplets,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Scan Sample", url: "/scan", icon: ScanLine },
  { title: "History", url: "/history", icon: History },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Reports", url: "/reports", icon: FileText },
  { title: "Settings", url: "/settings", icon: Settings },
] as const;

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="glass-panel sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-white/5 md:flex">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="grid h-10 w-10 place-items-center rounded-xl gradient-primary glow-primary">
          <Droplets className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold tracking-tight">Microplastic</p>
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">AI Scanner</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1 px-3">
        <p className="px-3 pb-2 pt-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Workspace
        </p>
        {nav.map((item) => {
          const active = pathname === item.url;
          return (
            <Link
              key={item.url}
              to={item.url}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "text-white"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
              )}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-xl gradient-primary glow-primary"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <item.icon className={cn("relative z-10 h-4 w-4 transition-transform group-hover:scale-110", active && "text-white")} />
              <span className="relative z-10">{item.title}</span>
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t border-white/5 p-4">
        <div className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-white/5">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[oklch(0.62_0.22_292)] to-[oklch(0.65_0.19_251)] text-sm font-semibold text-white">
            AK
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">Alex Kimani</p>
            <p className="truncate text-xs text-muted-foreground">alex@microscan.ai</p>
          </div>
          <span className="h-2 w-2 rounded-full bg-[oklch(0.72_0.18_145)] shadow-[0_0_8px_currentColor]" />
        </div>
      </div>
    </aside>
  );
}
