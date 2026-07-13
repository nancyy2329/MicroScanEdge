import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Activity,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  Droplets,
  ScanLine,
  Upload,
  FileDown,
  GitCompare,
  ArrowRight,
  ArrowUpRight,
} from "lucide-react";

import { useEffect, useState } from "react";

import { StatCard } from "@/components/stat-card";
import { PageHeader } from "@/components/page-header";
import { PageTransition } from "@/components/page-transition";
import { StatusBadge } from "@/components/status-badge";

import { getAnalyses } from "@/api/analysis";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getHistory } from "@/api/analysis";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Microplastic AI" },
      { name: "description", content: "Your AI-powered water quality control center." },
    ],
  }),
  component: Dashboard,
});

function Hero() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="glass-card relative overflow-hidden p-8 md:p-12"
    >
      {/* Radial background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-[oklch(0.65_0.19_251)] opacity-20 blur-[100px]" />
        <div className="absolute -right-10 top-0 h-80 w-80 rounded-full bg-[oklch(0.62_0.22_292)] opacity-25 blur-[110px]" />
      </div>

      <div className="relative grid gap-8 md:grid-cols-[1.2fr_1fr] md:items-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.72_0.18_145)] shadow-[0_0_8px_currentColor]" />
            AI Model v4.2 · Live
          </span>
          <h1 className="mt-4 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
            Detect microplastics <br className="hidden sm:inline" />
            in <span className="text-gradient">seconds.</span>
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
            Upload a water sample image and our vision model returns risk level,
            particle count, and confidence — with lab-grade accuracy and
            realtime insights.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/scan"
              className="group inline-flex items-center gap-2 rounded-xl gradient-primary px-5 py-3 text-sm font-semibold text-white glow-primary transition-transform hover:scale-[1.02]"
            >
              <ScanLine className="h-4 w-4" />
              Start Scan
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/history"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-foreground backdrop-blur transition-colors hover:bg-white/10"
            >
              View History
            </Link>
          </div>
        </div>

        {/* Droplet illustration */}
        <div className="relative mx-auto grid h-64 w-64 place-items-center sm:h-80 sm:w-80">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[oklch(0.65_0.19_251)] to-[oklch(0.62_0.22_292)] opacity-30 blur-3xl animate-pulse-glow" />
          <motion.div
            animate={{ y: [0, -14, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="relative grid h-44 w-44 place-items-center rounded-full bg-gradient-to-br from-[oklch(0.78_0.14_200)] via-[oklch(0.65_0.19_251)] to-[oklch(0.62_0.22_292)] shadow-[inset_-20px_-30px_60px_oklch(0_0_0/0.35),0_30px_80px_-20px_oklch(0.65_0.19_251/0.7)] sm:h-56 sm:w-56"
            style={{ borderRadius: "58% 42% 55% 45% / 40% 55% 45% 60%" }}
          >
            <Droplets className="h-16 w-16 text-white/90 drop-shadow-[0_2px_20px_rgba(255,255,255,0.6)]" />
            <div className="absolute left-6 top-8 h-6 w-6 rounded-full bg-white/60 blur-md" />
          </motion.div>

          {/* Bubbles */}
          {[
            { size: 12, x: -80, y: 40, delay: 0 },
            { size: 8, x: 90, y: -30, delay: 1.5 },
            { size: 16, x: 70, y: 80, delay: 0.8 },
            { size: 6, x: -60, y: -50, delay: 2.2 },
            { size: 10, x: -100, y: -20, delay: 1.1 },
          ].map((b, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full border border-white/40 bg-white/10 backdrop-blur"
              style={{ width: b.size, height: b.size, left: `calc(50% + ${b.x}px)`, top: `calc(50% + ${b.y}px)` }}
              animate={{ y: [0, -30, 0], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 4 + i, repeat: Infinity, ease: "easeInOut", delay: b.delay }}
            />
          ))}
        </div>
      </div>
    </motion.section>
  );
}

function ActivityChart() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="glass-card p-6 lg:col-span-2"
    >
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold">Weekly Scan Activity</h3>
          <p className="text-xs text-muted-foreground">Scans vs contamination — last 7 days</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-[oklch(0.72_0.18_145/0.12)] px-2.5 py-1 text-xs font-medium text-[oklch(0.85_0.15_145)] ring-1 ring-[oklch(0.72_0.18_145/0.35)]">
          <ArrowUpRight className="h-3 w-3" /> 12.4%
        </span>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={[]}>
            <defs>
              <linearGradient id="ga" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.65 0.19 251)" stopOpacity={0.55} />
                <stop offset="100%" stopColor="oklch(0.65 0.19 251)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gb" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.65 0.23 25)" stopOpacity={0.45} />
                <stop offset="100%" stopColor="oklch(0.65 0.23 25)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.05)" />
            <XAxis dataKey="day" stroke="oklch(0.72 0.02 255)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="oklch(0.72 0.02 255)" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ background: "oklch(0.19 0.02 265)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 12, fontSize: 12 }}
              cursor={{ stroke: "oklch(1 0 0 / 0.1)" }}
            />
            <Area type="monotone" dataKey="scans" stroke="oklch(0.78 0.14 200)" strokeWidth={2.5} fill="url(#ga)" />
            <Area type="monotone" dataKey="contaminated" stroke="oklch(0.7 0.2 10)" strokeWidth={2.5} fill="url(#gb)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

const quickActions = [
  { title: "Scan New Sample", desc: "Upload & analyze", icon: ScanLine, to: "/scan", accent: "from-[oklch(0.65_0.19_251)] to-[oklch(0.78_0.14_200)]" },
  { title: "Upload Image", desc: "Drag & drop", icon: Upload, to: "/scan", accent: "from-[oklch(0.62_0.22_292)] to-[oklch(0.65_0.19_251)]" },
  { title: "Export Report", desc: "Download PDF", icon: FileDown, to: "/reports", accent: "from-[oklch(0.72_0.18_145)] to-[oklch(0.78_0.14_170)]" },
  { title: "AI Insights", desc: "Trends & anomalies", icon: Sparkles, to: "/analytics", accent: "from-[oklch(0.78_0.16_75)] to-[oklch(0.65_0.23_25)]" },
  { title: "Compare Samples", desc: "Side-by-side", icon: GitCompare, to: "/history", accent: "from-[oklch(0.65_0.23_25)] to-[oklch(0.62_0.22_292)]" },
] as const;

function QuickActions() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.35 }}
      className="glass-card p-6"
    >
      <h3 className="mb-4 text-base font-semibold">Quick actions</h3>
      <div className="grid grid-cols-1 gap-3">
        {quickActions.map((a) => (
          <Link
            key={a.title}
            to={a.to}
            className="group grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3 transition-all hover:border-white/15 hover:bg-white/[0.05]"
          >
            <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${a.accent} text-white transition-transform group-hover:scale-110`}>
              <a.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{a.title}</p>
              <p className="truncate text-xs text-muted-foreground">{a.desc}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>
    </motion.div>
  );
}

function RecentScans({ scans }: { scans: any[] }) {
  const rows = scans.slice(0, 6);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="glass-card overflow-hidden"
    >
      <div className="flex items-center-justify-between p-6 pb-4">
        <div>
          <h3 className="text-base font-semibold">Recent scans</h3>
          <p className="text-xs text-muted-foreground">
            Latest samples analyzed by the model
          </p>
        </div>

        <Link
          to="/history"
          className="inline-flex items-center gap-1 text-xs font-medium text-[oklch(0.78_0.14_200)] hover:underline"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">

          <thead>
            <tr className="border-t border-white/5 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-6 py-3 font-medium">ID</th>
              <th className="px-6 py-3 font-medium">Date</th>
              <th className="px-6 py-3 font-medium">Score</th>
              <th className="px-6 py-3 font-medium">Risk</th>
              <th className="px-6 py-3 font-medium text-right">Action</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((s) => (
              <tr
                key={s.id}
                className="border-t border-white/5 transition-colors hover:bg-white/[0.03]"
              >

                <td className="px-6 py-3">
                  <p className="font-medium">
                    {s.id?.slice(0, 8)}
                  </p>
                </td>


                <td className="px-6 py-3 text-muted-foreground">
                  {new Date(s.createdAt).toLocaleDateString(
                    undefined,
                    {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  )}
                </td>


                <td className="px-6 py-3">
                  <div className="flex items-center gap-2">

                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full gradient-primary"
                        style={{
                          width: `${s.contaminationScore || 0}%`,
                        }}
                      />
                    </div>

                    <span className="text-xs tabular-nums text-muted-foreground">
                      {s.contaminationScore || 0}%
                    </span>

                  </div>
                </td>


                <td className="px-6 py-3">
                  <StatusBadge status={s.riskLevel} />
                </td>


                <td className="px-6 py-3 text-right">
                  <button
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/10"
                  >
                    View
                  </button>
                </td>

              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-8 text-center text-sm text-muted-foreground"
                >
                  No scans available yet.
                </td>
              </tr>
            )}

          </tbody>
        </table>
      </div>
    </motion.div>
  );
}


      function Dashboard() {
  const [scans, setScans] = useState<any[]>([]);

  const [stats, setStats] = useState({
    totalScans: 0,
    safeSamples: 0,
    contaminatedSamples: 0,
    aiAccuracy: 0,
  });

  useEffect(() => {
    async function loadScans() {
      try {
        const result = await getHistory();

        const items = result.data.items || [];

        setScans(items);

        const total = items.length;

        const safeSamples = items.filter(
          (item: any) =>
            item.riskLevel?.toLowerCase() === "safe" ||
            item.riskLevel?.toLowerCase() === "low"
        ).length;

        const contaminatedSamples = items.filter(
          (item: any) =>
            item.riskLevel?.toLowerCase() === "high" ||
            item.riskLevel?.toLowerCase() === "critical"
        ).length;

        setStats({
          totalScans: total,
          safeSamples,
          contaminatedSamples,
          aiAccuracy: 0,
        });

      } catch (error) {
        console.error("Failed loading scans:", error);
      }
    }

    loadScans();
  }, []);

  return (
    <PageTransition>
      <PageHeader title="Welcome back, Alex" subtitle="Here's what your AI has been detecting today." />
      <Hero />

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard index={0} label="Total Scans" value={stats.totalScans} delta="+184 this week" icon={Activity} accent="blue" />
        <StatCard index={1} label="Safe Samples" value={stats.safeSamples} delta="+9.2% vs last mo" icon={ShieldCheck} accent="green" />
        <StatCard index={2} label="Contaminated" value={stats.contaminatedSamples} delta="-3.1% vs last mo" icon={AlertTriangle} accent="red" />
        <StatCard index={3} label="AI Accuracy" value={stats.aiAccuracy} suffix="%" decimals={1} delta="+0.6% improvement" icon={Sparkles} accent="violet" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ActivityChart />
        <QuickActions />
      </div>

      <div className="mt-6">
        <RecentScans scans={scans} />
      </div>
    </PageTransition>
  );
}
