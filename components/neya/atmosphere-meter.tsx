"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AtmosphereMeterProps {
  score: number;
  className?: string;
}

export function AtmosphereMeter({ score, className }: AtmosphereMeterProps) {
  const pct = Math.min(100, Math.max(0, (score / 10) * 100));
  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center justify-between text-xs text-white/50">
        <span>Live atmosphere</span>
        <span className="font-semibold text-white tabular-nums">{score.toFixed(1)}/10</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-sky-400"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
