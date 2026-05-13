"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  glow?: "blue" | "pink" | "purple" | "none";
  className?: string;
  children?: React.ReactNode;
}

const glowClass: Record<NonNullable<GlassCardProps["glow"]>, string> = {
  none: "",
  blue: "shadow-[0_0_40px_rgba(56,189,248,0.12)]",
  pink: "shadow-[0_0_40px_rgba(244,114,182,0.12)]",
  purple: "shadow-[0_0_40px_rgba(167,139,250,0.15)]",
};

export function GlassCard({ className, glow = "blue", children }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.07] to-white/[0.02] p-5 backdrop-blur-2xl",
        glowClass[glow],
        className,
      )}
    >
      {children}
    </motion.div>
  );
}
