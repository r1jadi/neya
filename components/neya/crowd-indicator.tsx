"use client";

import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface CrowdIndicatorProps {
  count: number;
  className?: string;
  live?: boolean;
  scheduledLabel?: string;
}

export function CrowdIndicator({
  count,
  className,
  live = true,
  scheduledLabel = "Starts soon",
}: CrowdIndicatorProps) {
  const intensity = Math.min(1, count / 500);
  const label = live ? "Here now" : scheduledLabel;

  return (
    <div className={cn("flex items-center gap-2 text-white/90", className)}>
      <motion.span
        animate={live ? { scale: [1, 1.08, 1] } : { scale: 1 }}
        transition={live ? { repeat: Infinity, duration: 2.2, ease: "easeInOut" } : undefined}
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-full",
          live ? "bg-orange-500/15 text-orange-300" : "bg-white/10 text-white/50",
        )}
      >
        <Flame className="h-4 w-4" />
      </motion.span>
      <div>
        <p className="text-xs uppercase tracking-widest text-white/45">{label}</p>
        <p className="text-sm font-semibold tabular-nums">{live ? `${count} people` : "—"}</p>
      </div>
      {live ? (
        <div className="ml-auto h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-orange-400 to-pink-500"
            initial={{ width: 0 }}
            animate={{ width: `${intensity * 100}%` }}
            transition={{ duration: 0.8 }}
          />
        </div>
      ) : null}
    </div>
  );
}
