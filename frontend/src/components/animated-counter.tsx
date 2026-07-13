import { animate, useMotionValue, useTransform, motion } from "framer-motion";
import { useEffect } from "react";

export function AnimatedCounter({
  value,
  decimals = 0,
  suffix = "",
  duration = 1.4,
}: {
  value: number;
  decimals?: number;
  suffix?: string;
  duration?: number;
}) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => v.toFixed(decimals) + suffix);

  useEffect(() => {
    const controls = animate(mv, value, { duration, ease: [0.22, 1, 0.36, 1] });
    return controls.stop;
  }, [value, duration, mv]);

  return <motion.span>{rounded}</motion.span>;
}
