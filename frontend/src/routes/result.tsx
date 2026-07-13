import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Download, Share2, Sparkles, ArrowLeft, CheckCircle2 } from "lucide-react";
import { PageTransition } from "@/components/page-transition";
import { StatusBadge } from "@/components/status-badge";

export const Route = createFileRoute("/result")({
  head: () => ({
    meta: [
      { title: "Scan Result — Microplastic AI" },
      { name: "description", content: "AI analysis result for your water sample." },
    ],
  }),
  component: ResultPage,
});

function ResultPage() {
 const router = useRouterState();

const analysis = router.location.state?.analysis;

const confidence = analysis?.contaminationScore ?? 0;

const particles = analysis?.features?.particleEstimate ?? 0;

const risk = (analysis?.riskLevel ?? "").toLowerCase();

const status =
  risk === "high"
    ? "high"
    : risk === "medium"
    ? "medium"
    : "safe";

  return (
    <PageTransition>
      <Link to="/scan" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> New scan
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        {/* Confidence circle */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="glass-card grid place-items-center p-8 text-center"
        >
          <div className="relative grid h-64 w-64 place-items-center">
            <svg viewBox="0 0 120 120" className="h-64 w-64 -rotate-90">
              <circle cx="60" cy="60" r="52" strokeWidth="8" className="fill-none stroke-white/8" />
              <motion.circle
                cx="60" cy="60" r="52" strokeWidth="8"
                strokeLinecap="round"
                className="fill-none stroke-[url(#gr)]"
                initial={{ strokeDasharray: `0 ${2 * Math.PI * 52}` }}
                animate={{ strokeDasharray: `${(2 * Math.PI * 52 * confidence) / 100} ${2 * Math.PI * 52}` }}
                transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
              />
              <defs>
                <linearGradient id="gr" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="oklch(0.78 0.14 200)" />
                  <stop offset="50%" stopColor="oklch(0.65 0.19 251)" />
                  <stop offset="100%" stopColor="oklch(0.62 0.22 292)" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 grid place-items-center">
              <div>
                <p className="text-5xl font-bold text-gradient tabular-nums">{confidence}%</p>
                <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">Confidence</p>
              </div>
            </div>
          </div>
          <StatusBadge status={status} className="mt-6 px-4 py-1.5 text-sm" />
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{particles} microplastic particles</span> detected in the analyzed frame.
          </p>
        </motion.div>

        {/* Details */}
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="glass-card p-6"
          >
            <h3 className="text-lg font-semibold">Detection breakdown</h3>
            <div className="mt-4 space-y-4">
              {[
                { label: "Polyethylene fragments", value: 62 },
                { label: "Polypropylene fibers", value: 24 },
                { label: "Polystyrene beads", value: 14 },
              ].map((r) => (
                <div key={r.label}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="text-muted-foreground">{r.label}</span>
                    <span className="font-medium tabular-nums">{r.value}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${r.value}%` }}
                      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                      className="h-full gradient-primary"
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="glass-card relative overflow-hidden p-6"
          >
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[oklch(0.62_0.22_292)] opacity-20 blur-3xl" />
            <div className="relative flex items-start gap-4">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[oklch(0.62_0.22_292)] to-[oklch(0.65_0.19_251)] glow-primary">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold">AI recommendation</h3>

<p className="mt-2 text-sm leading-relaxed text-muted-foreground">
  {analysis?.explanation?.summary}
</p>
                <ul className="mt-3 space-y-1.5 text-sm">
                  {["Install pre-filter (0.45µm)", "Re-scan within 48h", "Log to compliance report"].map((t) => (
                    <li key={t} className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-[oklch(0.72_0.18_145)]" /> {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>

          <div className="flex flex-wrap gap-3">
            <button className="inline-flex items-center gap-2 rounded-xl gradient-primary px-5 py-3 text-sm font-semibold text-white glow-primary">
              <Download className="h-4 w-4" /> Download PDF Report
            </button>
            <button className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold">
              <Share2 className="h-4 w-4" /> Share Result
            </button>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
