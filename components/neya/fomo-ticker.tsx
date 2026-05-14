"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface FomoTickerProps {
  lines: string[];
}

export function FomoTicker({ lines }: FomoTickerProps) {
  const pool = useMemo(() => lines.filter(Boolean), [lines]);
  const [i, setI] = useState(0);

  useEffect(() => {
    if (!pool.length) return;
    const t = window.setInterval(() => {
      setI((v) => (v + 1) % pool.length);
    }, 5200);
    return () => window.clearInterval(t);
  }, [pool.length]);

  if (!pool.length) return null;
  const line = pool[i % pool.length];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-fuchsia-500/25 bg-gradient-to-r from-fuchsia-950/40 via-black/60 to-sky-950/30 px-4 py-3">
      <AnimatePresence mode="wait">
        <motion.p
          key={line}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.35 }}
          className="text-center text-sm font-medium text-fuchsia-100/95"
        >
          {line}
        </motion.p>
      </AnimatePresence>
      <span className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-fuchsia-500/20 blur-2xl" />
    </div>
  );
}
