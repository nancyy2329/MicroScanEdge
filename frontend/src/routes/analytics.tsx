import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { PageHeader } from "@/components/page-header";
import { PageTransition } from "@/components/page-transition";
import {
  accuracyTrend, contaminationTrend, riskDistribution, weeklyActivity,
} from "@/lib/mock-data";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Microplastic AI" },
      { name: "description", content: "Trends, distributions, and model performance." },
    ],
  }),
  component: Analytics,
});

const tooltipStyle = {
  background: "oklch(0.19 0.02 265)",
  border: "1px solid oklch(1 0 0 / 0.1)",
  borderRadius: 12,
  fontSize: 12,
};

function ChartCard({ title, subtitle, children, delay = 0 }: { title: string; subtitle?: string; children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="glass-card p-6"
    >
      <div className="mb-4">
        <h3 className="font-semibold">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">{children as React.ReactElement}</ResponsiveContainer>
      </div>
    </motion.div>
  );
}

function Analytics() {
  return (
    <PageTransition>
      <PageHeader title="Analytics" subtitle="Deep insights across your sampling program." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Weekly Scan Activity" subtitle="Scans per day" delay={0.05}>
          <BarChart data={weeklyActivity}>
            <defs>
              <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.78 0.14 200)" />
                <stop offset="100%" stopColor="oklch(0.65 0.19 251)" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.05)" />
            <XAxis dataKey="day" stroke="oklch(0.72 0.02 255)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="oklch(0.72 0.02 255)" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "oklch(1 0 0 / 0.04)" }} />
            <Bar dataKey="scans" fill="url(#bg)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Contamination Trend" subtitle="Detected contamination % over months" delay={0.1}>
          <AreaChart data={contaminationTrend}>
            <defs>
              <linearGradient id="ct" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.65 0.23 25)" stopOpacity={0.6} />
                <stop offset="100%" stopColor="oklch(0.65 0.23 25)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.05)" />
            <XAxis dataKey="month" stroke="oklch(0.72 0.02 255)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="oklch(0.72 0.02 255)" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area type="monotone" dataKey="level" stroke="oklch(0.7 0.2 10)" strokeWidth={2.5} fill="url(#ct)" />
          </AreaChart>
        </ChartCard>

        <ChartCard title="AI Accuracy Trend" subtitle="Model performance over time" delay={0.15}>
          <LineChart data={accuracyTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.05)" />
            <XAxis dataKey="week" stroke="oklch(0.72 0.02 255)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis domain={[90, 100]} stroke="oklch(0.72 0.02 255)" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey="accuracy" stroke="oklch(0.62 0.22 292)" strokeWidth={3} dot={{ fill: "oklch(0.62 0.22 292)", r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ChartCard>

        <ChartCard title="Risk Distribution" subtitle="All samples by risk level" delay={0.2}>
          <PieChart>
            <Pie data={riskDistribution} innerRadius={60} outerRadius={95} paddingAngle={3} dataKey="value">
              {riskDistribution.map((e, i) => <Cell key={i} fill={e.color} stroke="none" />)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ChartCard>
      </div>
    </PageTransition>
  );
}
