export type ScanStatus = "safe" | "medium" | "high";

export interface Scan {
  id: string;
  sampleId: string;
  date: string;
  confidence: number;
  status: ScanStatus;
  location: string;
  particleCount: number;
  thumbnail: string;
}

const thumbs = [
  "https://images.unsplash.com/photo-1502691876148-a84978e59af8?w=200&h=200&fit=crop",
  "https://images.unsplash.com/photo-1544025162-d76694265947?w=200&h=200&fit=crop",
  "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=200&h=200&fit=crop",
  "https://images.unsplash.com/photo-1439405326854-014607f694d7?w=200&h=200&fit=crop",
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=200&h=200&fit=crop",
];

const statuses: ScanStatus[] = ["safe", "safe", "medium", "high", "safe", "medium", "safe", "high", "safe", "medium", "safe", "safe"];

export const scans: Scan[] = statuses.map((s, i) => ({
  id: `scan-${i + 1}`,
  sampleId: `MP-${String(2417 - i).padStart(5, "0")}`,
  date: new Date(Date.now() - i * 1000 * 60 * 60 * 7).toISOString(),
  confidence: 88 + ((i * 7) % 11),
  status: s,
  location: ["Lake Nakuru", "Nairobi River", "Coastal Bay", "Tap Water — Nairobi", "Athi River", "Mombasa Port"][i % 6],
  particleCount: s === "safe" ? 2 + (i % 4) : s === "medium" ? 18 + (i % 10) : 42 + (i % 15),
  thumbnail: thumbs[i % thumbs.length],
}));

export const stats = {
  totalScans: 2417,
  safeSamples: 1834,
  contaminatedSamples: 583,
  aiAccuracy: 97.4,
};

export const weeklyActivity = [
  { day: "Mon", scans: 24, contaminated: 5 },
  { day: "Tue", scans: 32, contaminated: 8 },
  { day: "Wed", scans: 28, contaminated: 6 },
  { day: "Thu", scans: 41, contaminated: 12 },
  { day: "Fri", scans: 38, contaminated: 9 },
  { day: "Sat", scans: 22, contaminated: 4 },
  { day: "Sun", scans: 19, contaminated: 3 },
];

export const contaminationTrend = [
  { month: "Jan", level: 22 },
  { month: "Feb", level: 28 },
  { month: "Mar", level: 24 },
  { month: "Apr", level: 34 },
  { month: "May", level: 30 },
  { month: "Jun", level: 41 },
  { month: "Jul", level: 38 },
  { month: "Aug", level: 45 },
  { month: "Sep", level: 39 },
];

export const accuracyTrend = [
  { week: "W1", accuracy: 94.1 },
  { week: "W2", accuracy: 95.0 },
  { week: "W3", accuracy: 95.8 },
  { week: "W4", accuracy: 96.4 },
  { week: "W5", accuracy: 96.9 },
  { week: "W6", accuracy: 97.1 },
  { week: "W7", accuracy: 97.4 },
];

export const riskDistribution = [
  { name: "Safe", value: 1834, color: "oklch(0.72 0.18 145)" },
  { name: "Medium", value: 402, color: "oklch(0.78 0.16 75)" },
  { name: "High", value: 181, color: "oklch(0.65 0.23 25)" },
];

export const spark = (base: number, n = 12) =>
  Array.from({ length: n }, (_, i) => ({
    x: i,
    y: base + Math.sin(i * 0.9) * (base * 0.15) + (i % 3) * (base * 0.05),
  }));
