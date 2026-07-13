import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Search, Filter, Download } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PageTransition } from "@/components/page-transition";
import { StatusBadge } from "@/components/status-badge";
import { scans, type ScanStatus } from "@/lib/mock-data";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Scan History — Microplastic AI" },
      { name: "description", content: "Search, filter, and export your scan history." },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<ScanStatus | "all">("all");
  const [page, setPage] = useState(1);
  const perPage = 8;

  const filtered = useMemo(() => {
    return scans.filter((s) => {
      if (filter !== "all" && s.status !== filter) return false;
      if (q && !`${s.sampleId} ${s.location}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [q, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const rows = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <PageTransition>
      <PageHeader title="Scan history" subtitle={`${filtered.length} samples`} />

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card overflow-hidden">
        {/* Toolbar */}
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4 sm:flex sm:flex-wrap sm:justify-between">
          <div className="flex min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 sm:w-72">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder="Search by ID or location..."
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="flex rounded-xl border border-white/10 bg-white/5 p-1 text-xs">
              {(["all", "safe", "medium", "high"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => { setFilter(f); setPage(1); }}
                  className={`rounded-lg px-3 py-1.5 font-medium capitalize transition-colors ${
                    filter === f ? "gradient-primary text-white" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <button className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium hover:bg-white/10">
              <Filter className="h-3.5 w-3.5" /> Date
            </button>
            <button className="inline-flex items-center gap-2 rounded-xl gradient-primary px-3 py-2 text-xs font-semibold text-white glow-primary">
              <Download className="h-3.5 w-3.5" /> Export CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t border-white/5 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-6 py-3 font-medium">Sample</th>
                <th className="px-6 py-3 font-medium">Location</th>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Particles</th>
                <th className="px-6 py-3 font-medium">Confidence</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="border-t border-white/5 transition-colors hover:bg-white/[0.03]">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <img src={s.thumbnail} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-white/10" />
                      <p className="font-medium">{s.sampleId}</p>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-muted-foreground">{s.location}</td>
                  <td className="px-6 py-3 text-muted-foreground">
                    {new Date(s.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="px-6 py-3 tabular-nums">{s.particleCount}</td>
                  <td className="px-6 py-3 tabular-nums">{s.confidence}%</td>
                  <td className="px-6 py-3"><StatusBadge status={s.status} /></td>
                  <td className="px-6 py-3 text-right">
                    <button className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/10">
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-sm text-muted-foreground">No samples match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-white/5 p-4 text-xs text-muted-foreground">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 disabled:opacity-40">Prev</button>
            <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 disabled:opacity-40">Next</button>
          </div>
        </div>
      </motion.div>
    </PageTransition>
  );
}
