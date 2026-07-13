import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useRef, useState } from "react";
import { createAnalysis } from "@/api/analysis";
import { UploadCloud, ImagePlus, X, Sparkles, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PageTransition } from "@/components/page-transition";
import { useRouterState } from "@tanstack/react-router";

export const Route = createFileRoute("/scan")({
  head: () => ({
    meta: [
      { title: "Scan Sample — Microplastic AI" },
      { name: "description", content: "Upload a water sample and get instant AI analysis." },
    ],
  }),
  component: ScanPage,
});

function ScanPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [drag, setDrag] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleFile = (f: File) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const startAnalysis = async () => {
    if (!file) return;

    try {
      setAnalyzing(true);
      setProgress(20);

      const result = await createAnalysis(file);

setProgress(100);

navigate({
  to: "/result",
  search: {
    id: result.data.id,
  },
});
    } catch (error) {
      console.error(error);
      alert("Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setAnalyzing(false);
    setProgress(0);
  };

  return (
    <PageTransition>
      <PageHeader title="Scan a sample" subtitle="Drop an image and let the AI do the rest." />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Uploader */}
        <motion.div layout className="glass-card p-6">
          {!preview && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                const f = e.dataTransfer.files?.[0];
                if (f) handleFile(f);
              }}
              onClick={() => inputRef.current?.click()}
              className={`relative grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed p-14 text-center transition-all ${
                drag ? "border-[oklch(0.65_0.19_251)] bg-white/[0.04] glow-primary" : "border-white/10 hover:border-white/25 hover:bg-white/[0.02]"
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="grid h-20 w-20 place-items-center rounded-2xl gradient-primary glow-primary"
              >
                <UploadCloud className="h-9 w-9 text-white" />
              </motion.div>
              <p className="mt-6 text-lg font-semibold">Drag & drop your sample</p>
              <p className="mt-1 text-sm text-muted-foreground">or click to browse — PNG, JPG up to 10MB</p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">Microscopy</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">Turbidity</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">Filter cross-sections</span>
              </div>
            </div>
          )}

          <AnimatePresence>
            {preview && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="relative overflow-hidden rounded-2xl border border-white/10">
                  <img src={preview} alt="Preview" className="max-h-[420px] w-full object-cover" />
                  {!analyzing && (
                    <button
                      onClick={reset}
                      className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/60 backdrop-blur transition-colors hover:bg-black/80"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}

                  {analyzing && (
                    <div className="absolute inset-0 grid place-items-center bg-black/60 backdrop-blur-sm">
                      <div className="relative grid place-items-center">
                        <svg viewBox="0 0 120 120" className="h-40 w-40 -rotate-90">
                          <circle cx="60" cy="60" r="52" strokeWidth="6" className="fill-none stroke-white/10" />
                          <circle
                            cx="60" cy="60" r="52" strokeWidth="6"
                            strokeLinecap="round"
                            className="fill-none stroke-[url(#g1)]"
                            strokeDasharray={2 * Math.PI * 52}
                            strokeDashoffset={2 * Math.PI * 52 * (1 - progress / 100)}
                            style={{ transition: "stroke-dashoffset 0.22s ease" }}
                          />
                          <defs>
                            <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
                              <stop offset="0%" stopColor="oklch(0.65 0.19 251)" />
                              <stop offset="100%" stopColor="oklch(0.78 0.14 200)" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="absolute inset-0 grid place-items-center">
                          <div className="text-center">
                            <p className="text-3xl font-bold tabular-nums text-gradient">{Math.round(progress)}%</p>
                            <p className="mt-1 text-xs text-muted-foreground">Analyzing…</p>
                          </div>
                        </div>
                        <div className="pointer-events-none absolute inset-0 animate-pulse-glow rounded-full" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{file?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {file && `${(file.size / 1024).toFixed(1)} KB`} · Ready for analysis
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={reset}
                      disabled={analyzing}
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm disabled:opacity-40"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={startAnalysis}
                      disabled={analyzing}
                      className="inline-flex items-center gap-2 rounded-xl gradient-primary px-5 py-2 text-sm font-semibold text-white glow-primary disabled:opacity-70"
                    >
                      {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      {analyzing ? "Analyzing…" : "Run AI Analysis"}
                    </button>
                  </div>
                </div>

                {analyzing && (
                  <p className="text-center text-sm text-muted-foreground">
                    Analyzing water sample<span className="inline-flex ml-1">
                      {[0,1,2].map(i => (
                        <motion.span key={i} animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.2 }}>.</motion.span>
                      ))}
                    </span>
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <div className="space-y-4">
          <div className="glass-card p-6">
            <div className="mb-3 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[oklch(0.62_0.22_292)] to-[oklch(0.65_0.19_251)]">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-semibold">How it works</h3>
            </div>
            <ol className="space-y-3 text-sm text-muted-foreground">
              {["Upload a clear microscopy or sample image.", "Vision model segments particles in ~3s.", "Get risk level, confidence, and a downloadable report."].map((t, i) => (
                <li key={i} className="flex gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-xs font-semibold text-foreground">{i + 1}</span>
                  <span>{t}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="glass-card p-6">
            <h3 className="mb-2 font-semibold">Tips</h3>
            <p className="text-sm text-muted-foreground">
              Best results with high-contrast microscopy at 40×–400× magnification.
              Avoid motion blur and uneven lighting.
            </p>
            <Link to="/history" className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-[oklch(0.78_0.14_200)] hover:underline">
              <ImagePlus className="h-3.5 w-3.5" /> See past scans for reference
            </Link>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
