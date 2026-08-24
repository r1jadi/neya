"use client";

import { Check, Plus } from "lucide-react";
import { useMyNight } from "@/components/my-night/my-night-provider";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import type { NightStopDisplay } from "@/types";

interface MyNightButtonProps {
  stop: NightStopDisplay;
  variant?: "icon" | "default";
  className?: string;
}

export function MyNightButton({ stop, variant = "icon", className }: MyNightButtonProps) {
  const { t } = useI18n();
  const { hydrated, stops, addStop, removeStop, limitHit } = useMyNight();
  const index = stops.findIndex((s) => s.kind === stop.kind && s.refId === stop.refId);
  const added = index >= 0;
  const blocked = limitHit && !added;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        if (!hydrated) return; // plan not loaded yet — avoid clobbering it
        if (added) removeStop(index);
        else addStop(stop);
      }}
      aria-pressed={added}
      aria-label={added ? t.actions.removeFromMyNight : t.actions.addToMyNight}
      title={blocked ? t.actions.myNightLimit : added ? t.actions.removeFromMyNight : t.actions.addToMyNight}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-xl border text-xs font-semibold backdrop-blur-md transition",
        variant === "icon" ? "h-9 w-9 border-white/15 bg-black/60 text-white/80 hover:text-white" : "h-9 px-3",
        added
          ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-100"
          : blocked
            ? "border-amber-400/40 bg-amber-500/10 text-amber-100"
            : "border-white/15 bg-black/60 text-white/80 hover:border-sky-400/40 hover:text-white",
        className,
      )}
    >
      {added ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
      {variant === "default" ? (added ? t.actions.added : blocked ? t.actions.max3 : t.actions.myNightPlus) : null}
    </button>
  );
}
