import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { FileDown, FileText, Calendar } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PageTransition } from "@/components/page-transition";

export const Route = createFileRoute("/report")({
  head: () => ({
    meta: [
      { title: "Reports — Microplastic AI" },
      { name: "description", content: "Generate and download compliance-ready reports." },
    ],
  }),
  component: Reports,
});

const reports = [
  { title: "October 2026 Compliance Summary", date: "Oct 31, 2026", size: "2.4 MB", samples: 184 },
  { title: "Q3 2026 Water Quality Report", date: "Sep 30, 2026", size: "5.1 MB", samples: 512 },
  { title: "Lake Nakuru — Field Study", date: "Sep 12, 2026", size: "1.8 MB", samples: 47 },
  { title: "September 2026 Monthly Recap", date: "Sep 30, 2026", size: "2.1 MB", samples: 168 },
];

function Reports() {
  return (
    <PageTransition>
      <PageHeader title="Reports" subtitle="Export lab-grade PDF reports and dataset dumps." />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card divide-y divide-white/5">
          <div className="p-6">
            <h3 className="font-semibold">Recent reports</h3>
          </div>
          {reports.map((r) => (
            <div key={r.title} className="flex items-center gap-4 p-6 transition-colors hover:bg-white/[0.03]">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[oklch(0.65_0.19_251)] to-[oklch(0.78_0.14_200)] glow-primary">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{r.title}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {r.date} · {r.samples} samples · {r.size}
                </p>
              </div>
              <button className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium hover:bg-white/10">
                <FileDown className="h-3.5 w-3.5" /> Download
              </button>
            </div>
          ))}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[oklch(0.62_0.22_292)] to-[oklch(0.65_0.19_251)]">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <h3 className="font-semibold">Generate new report</h3>
          </div>
          <div className="space-y-3">
            <label className="block text-xs text-muted-foreground">Report type</label>
            <select className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none">
              <option>Monthly compliance summary</option>
              <option>Field study</option>
              <option>Custom range</option>
            </select>
            <label className="block pt-2 text-xs text-muted-foreground">Date range</label>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none" />
              <input type="date" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none" />
            </div>
            <button className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl gradient-primary px-4 py-2.5 text-sm font-semibold text-white glow-primary">
              <FileDown className="h-4 w-4" /> Generate PDF
            </button>
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
}
