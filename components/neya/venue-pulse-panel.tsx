"use client";

import { Radio } from "lucide-react";
import { useEffect, useState } from "react";
import type { VenuePulse } from "@/services/pulse";
import { cn } from "@/lib/utils";

interface VenuePulsePanelProps {
  /** Real aggregates from reviews across the venue’s events; null when unavailable. */
  pulse?: VenuePulse | null;
  /** Real “here now” count from the venue row. */
  crowdCount?: number;
  className?: string;
}

function clamp(value: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, value));
}

function PulseBar({ label, value }: { label: string; value: number | null }) {
  if (value == null) return null;
  const pct = clamp(value, 0, 10) * 10;
  return (
    <div>
      <div className="flex items-baseline justify-between text-[11px]">
        <span className="uppercase tracking-widest text-white/45">{label}</span>
        <span className="font-bold tabular-nums text-white/90">{value.toFixed(1)}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className={cn(
            "h-full rounded-full",
            label === "Line"
              ? "bg-gradient-to-r from-amber-400 to-orange-500"
              : "bg-gradient-to-r from-violet-500 via-fuchsia-500 to-sky-400",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function updatedAgo(updatedAt: string | null): string | null {
  if (!updatedAt) return null;
  const mins = Math.round((Date.now() - new Date(updatedAt).getTime()) / 60000);
  if (mins < 1) return "Updated just now";
  if (mins < 60) return `Updated ${mins} min ago`;
  const hours = Math.floor(mins / 60);
  return `Updated ${hours}h ago`;
}

/** Read-only venue signal — same visual language as the event pulse, no fabricated values. */
export function VenuePulsePanel({ pulse, crowdCount, className }: VenuePulsePanelProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const overall = pulse?.overall ?? null;
  const pct = overall == null ? 0 : clamp(overall, 0, 10) * 10;
  const ago = mounted ? updatedAgo(pulse?.updatedAt ?? null) : null;
  const hasBars = pulse?.music != null || pulse?.crowd != null || pulse?.line != null;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] via-zinc-950/80 to-violet-950/30",
        className,
      )}
    >
      <div className="relative border-b border-white/[0.07] p-5">
        <div className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full bg-fuchsia-600/15 blur-3xl" />
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-emerald-400" />
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/70">NEYA Pulse</p>
          {overall != null ? (
            <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              Live
            </span>
          ) : null}
        </div>

        {overall == null ? (
          <p className="mt-4 rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-5 text-center text-sm text-white/45">
            The Pulse here builds from crowd check-ins and vibe drops — be the first to leave one at the next night.
          </p>
        ) : (
          <div className="mt-4 flex items-center gap-5">
            <div className="relative h-20 w-20 shrink-0">
              <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90">
                <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  fill="none"
                  stroke="url(#venueRingGradient)"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={`${(pct / 100) * 213.6} 213.6`}
                />
                <defs>
                  <linearGradient id="venueRingGradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#f472b6" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold tabular-nums text-white">{overall.toFixed(1)}</span>
              </div>
            </div>
            <div className="min-w-0">
              <p className="font-[family-name:var(--font-display)] text-lg font-bold leading-tight text-white">
                Overall vibe
              </p>
              <p className="mt-1 text-xs leading-relaxed text-white/50">
                Drops from the room, averaged live across the venue’s nights.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/55">
                {pulse && pulse.samples > 0 ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-300">
                    <Radio className="h-3 w-3" /> {pulse.samples} {pulse.samples === 1 ? "pulse" : "pulses"}
                  </span>
                ) : null}
                {crowdCount && crowdCount > 0 ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-sky-300">
                    👥 {crowdCount} here now
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {hasBars ? (
          <div className="mt-4 grid gap-2.5">
            <PulseBar label="Music" value={pulse?.music} />
            <PulseBar label="Crowd" value={pulse?.crowd} />
            <PulseBar label="Line" value={pulse?.line} />
          </div>
        ) : null}

        {overall != null ? (
          <p className="mt-4 text-[11px] text-white/40">{ago}</p>
        ) : null}
      </div>
    </div>
  );
}