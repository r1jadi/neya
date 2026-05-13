"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const neonClassName =
  "relative inline-flex h-12 items-center justify-center overflow-hidden rounded-full bg-gradient-to-r from-sky-400 via-cyan-300 to-fuchsia-400 px-8 text-sm font-bold text-zinc-950 shadow-[0_0_32px_rgba(56,189,248,0.45)] transition-shadow hover:shadow-[0_0_48px_rgba(244,114,182,0.45)]";

interface NeonButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  asChild?: boolean;
}

export function NeonButton({ className, children, asChild, ...props }: NeonButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <motion.span whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="inline-flex">
      <Comp className={cn(neonClassName, className)} {...props}>
        {asChild ? (
          children
        ) : (
          <>
            <span className="relative z-10">{children}</span>
            <span className="pointer-events-none absolute inset-0 bg-white/25 opacity-0 mix-blend-overlay transition-opacity hover:opacity-100" />
          </>
        )}
      </Comp>
    </motion.span>
  );
}
