"use client";

import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface CrowdIndicatorProps {
  count: number;
  className?: string;
}

export function CrowdIndicator({ count, className }: CrowdIndicatorProps) {
  const intensity = Math.min(1, count / 500);
  return (
    <div className={cn("flex items-center gap-2 text-white/90", className)}>
      <motion.span
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/15 text-orange-300"
      >
        <Flame className="h-4 w-4" />
      </motion.span>
      <div>
        <p className="text-xs uppercase tracking-widest text-white/45">Here now</p>
        <p className="text-sm font-semibold tabular-nums">{count} people</p>
      </div>
      <div className="ml-auto h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-orange-400 to-pink-500"
          initial={{ width: 0 }}
          animate={{ width: `${intensity * 100}%` }}
          transition={{ duration: 0.8 }}
        />
      </div>
    </div>
  );
}
