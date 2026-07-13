import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { Bell, Moon, User, Zap, Info, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PageTransition } from "@/components/page-transition";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Microplastic AI" },
      { name: "description", content: "Manage profile, notifications, theme, and API status." },
    ],
  }),
  component: Settings,
});

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "gradient-primary glow-primary" : "bg-white/10"}`}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow ${checked ? "right-0.5" : "left-0.5"}`}
      />
    </button>
  );
}

function Section({ icon: Icon, title, subtitle, children }: { icon: typeof Bell; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6"
    >
      <div className="mb-5 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[oklch(0.65_0.19_251)] to-[oklch(0.78_0.14_200)] glow-primary">
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {children}
    </motion.div>
  );
}

function Settings() {
  const [dark, setDark] = useState(true);
  const [notif, setNotif] = useState({ email: true, contamination: true, weekly: false });

  return (
    <PageTransition>
      <PageHeader title="Settings" subtitle="Personalize your workspace." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Section icon={User} title="Profile" subtitle="How you appear in the app">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[oklch(0.62_0.22_292)] to-[oklch(0.65_0.19_251)] text-lg font-semibold text-white">AK</div>
            <div className="min-w-0 flex-1 space-y-2">
              <input defaultValue="Alex Kimani" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none" />
              <input defaultValue="alex@microscan.ai" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none" />
            </div>
          </div>
          <button className="mt-4 rounded-xl gradient-primary px-4 py-2 text-sm font-semibold text-white glow-primary">Save changes</button>
        </Section>

        <Section icon={Moon} title="Appearance" subtitle="Theme and display">
          <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <div>
              <p className="text-sm font-medium">Dark mode</p>
              <p className="text-xs text-muted-foreground">Easier on the eyes at night</p>
            </div>
            <Toggle checked={dark} onChange={setDark} />
          </div>
        </Section>

        <Section icon={Bell} title="Notifications" subtitle="Choose what pings you">
          {([
            ["Email alerts", "email"],
            ["Contamination detected", "contamination"],
            ["Weekly summary", "weekly"],
          ] as const).map(([label, key]) => (
            <div key={key} className="flex items-center justify-between border-t border-white/5 py-3 first:border-t-0">
              <p className="text-sm">{label}</p>
              <Toggle checked={notif[key]} onChange={(v) => setNotif({ ...notif, [key]: v })} />
            </div>
          ))}
        </Section>

        <Section icon={Zap} title="API status" subtitle="Live service health">
          {[
            { name: "Inference API", status: "Operational" },
            { name: "Storage", status: "Operational" },
            { name: "Auth", status: "Operational" },
          ].map((s) => (
            <div key={s.name} className="flex items-center justify-between border-t border-white/5 py-3 first:border-t-0">
              <p className="text-sm">{s.name}</p>
              <span className="inline-flex items-center gap-1.5 text-xs text-[oklch(0.85_0.15_145)]">
                <CheckCircle2 className="h-3.5 w-3.5" /> {s.status}
              </span>
            </div>
          ))}
        </Section>

        <Section icon={Info} title="About" subtitle="Version & credits">
          <p className="text-sm text-muted-foreground">
            Microplastic AI · v4.2.1 · Built with love for cleaner water.
          </p>
        </Section>
      </div>
    </PageTransition>
  );
}
