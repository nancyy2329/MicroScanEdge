import { motion } from "framer-motion";
import { Bell, Search } from "lucide-react";

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 pb-6"
    >
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 truncate text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-muted-foreground backdrop-blur md:flex">
          <Search className="h-4 w-4" />
          <input
            placeholder="Search samples..."
            className="w-56 bg-transparent outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded border border-white/10 px-1.5 py-0.5 text-[10px]">⌘K</kbd>
        </div>
        <button className="relative grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground">
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[oklch(0.65_0.23_25)] shadow-[0_0_8px_currentColor]" />
        </button>
      </div>
    </motion.header>
  );
}
