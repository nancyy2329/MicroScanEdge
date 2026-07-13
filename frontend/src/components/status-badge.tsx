import { cn } from "@/lib/utils";
import type { ScanStatus } from "@/lib/mock-data";

const cfg: Record<ScanStatus, { label: string; dot: string; text: string; bg: string; ring: string }> = {
  safe: {
    label: "Safe",
    dot: "bg-[oklch(0.72_0.18_145)]",
    text: "text-[oklch(0.85_0.15_145)]",
    bg: "bg-[oklch(0.72_0.18_145/0.12)]",
    ring: "ring-1 ring-[oklch(0.72_0.18_145/0.35)]",
  },
  medium: {
    label: "Medium Risk",
    dot: "bg-[oklch(0.78_0.16_75)]",
    text: "text-[oklch(0.88_0.15_75)]",
    bg: "bg-[oklch(0.78_0.16_75/0.12)]",
    ring: "ring-1 ring-[oklch(0.78_0.16_75/0.35)]",
  },
  high: {
    label: "High Risk",
    dot: "bg-[oklch(0.65_0.23_25)]",
    text: "text-[oklch(0.8_0.2_25)]",
    bg: "bg-[oklch(0.65_0.23_25/0.12)]",
    ring: "ring-1 ring-[oklch(0.65_0.23_25/0.35)]",
  },
};

export function StatusBadge({ status, className }: { status: ScanStatus; className?: string }) {
  const c = cfg[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        c.bg,
        c.text,
        c.ring,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full shadow-[0_0_8px_currentColor]", c.dot)} />
      {c.label}
    </span>
  );
}
