import { motion } from "framer-motion";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedCounter } from "./animated-counter";
import { spark } from "@/lib/mock-data";

type Accent = "blue" | "green" | "red" | "violet";

const accentMap: Record<Accent, { grad: string; glow: string; stroke: string; fill: string }> = {
  blue:   { grad: "from-[oklch(0.65_0.19_251)] to-[oklch(0.78_0.14_200)]", glow: "shadow-[0_0_40px_-10px_oklch(0.65_0.19_251/0.6)]", stroke: "oklch(0.78 0.14 200)", fill: "oklch(0.65 0.19 251)" },
  green:  { grad: "from-[oklch(0.72_0.18_145)] to-[oklch(0.78_0.14_170)]", glow: "shadow-[0_0_40px_-10px_oklch(0.72_0.18_145/0.55)]", stroke: "oklch(0.78 0.14 170)", fill: "oklch(0.72 0.18 145)" },
  red:    { grad: "from-[oklch(0.65_0.23_25)] to-[oklch(0.7_0.2_10)]",     glow: "shadow-[0_0_40px_-10px_oklch(0.65_0.23_25/0.55)]",  stroke: "oklch(0.7 0.2 10)",   fill: "oklch(0.65 0.23 25)" },
  violet: { grad: "from-[oklch(0.62_0.22_292)] to-[oklch(0.65_0.19_251)]", glow: "shadow-[0_0_40px_-10px_oklch(0.62_0.22_292/0.55)]", stroke: "oklch(0.65 0.19 251)", fill: "oklch(0.62 0.22 292)" },
};

interface Props {
  label: string;
  value: number;
  suffix?: string;
  decimals?: number;
  delta?: string;
  icon: LucideIcon;
  accent: Accent;
  index?: number;
}

export function StatCard({ label, value, suffix, decimals, delta, icon: Icon, accent, index = 0 }: Props) {
  const a = accentMap[accent];
  const data = spark(value / 4);
  const id = `grad-${accent}-${index}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
      className="glass-card relative overflow-hidden p-5 transition-shadow duration-300 hover:shadow-[0_20px_50px_-20px_oklch(0_0_0/0.7)]"
    >
      <div className={cn("absolute -top-16 -right-16 h-40 w-40 rounded-full bg-gradient-to-br opacity-20 blur-3xl", a.grad)} />
      <div className="relative flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold tracking-tight text-foreground">
            <AnimatedCounter value={value} suffix={suffix} decimals={decimals} />
          </p>
          {delta && <p className="text-xs font-medium text-[oklch(0.78_0.14_170)]">{delta}</p>}
        </div>
        <div className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white", a.grad, a.glow)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-4 h-14 -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={a.fill} stopOpacity={0.5} />
                <stop offset="100%" stopColor={a.fill} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="y" stroke={a.stroke} strokeWidth={2} fill={`url(#${id})`} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
