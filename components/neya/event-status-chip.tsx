"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

interface EventStatusChipProps {
  startsAt: string;
  endsAt?: string | null;
  liveStatus?: boolean;
  className?: string;
}

const HOUR = 3600000;
const DAY = 24 * HOUR;

function computeStatus(
  startsAt: string,
  endsAt: string | null | undefined,
  liveStatus: boolean,
  now: Date,
): { text: string; tone: "live" | "soon" | "over" } | null {
  const start = new Date(startsAt).getTime();
  const end = endsAt ? new Date(endsAt).getTime() : start + 8 * HOUR;
  const t = now.getTime();

  if (t >= start && t <= end) {
    return liveStatus ? { text: "Live now", tone: "live" } : { text: "Happening now", tone: "live" };
  }
  if (t > end) {
    // Only surface the ended state while it is still recent enough to matter.
    if (t - end > 48 * HOUR) return null;
    return { text: "Event ended", tone: "over" };
  }
  const diff = start - t;
  if (diff > 7 * DAY) return null;

  if (diff <= HOUR) {
    const mins = Math.max(1, Math.round(diff / 60000));
    return { text: `Starts in ${mins}m`, tone: "live" };
  }
  if (diff < 24 * HOUR) {
    const hours = Math.floor(diff / HOUR);
    const mins = Math.round((diff % HOUR) / 60000);
    return { text: `Starts in ${hours}h ${mins}m`, tone: "live" };
  }
  if (diff < 48 * HOUR) {
    return { text: `Starts in ${Math.floor(diff / HOUR)}h`, tone: "live" };
  }
  return { text: `Starts in ${Math.round(diff / DAY)}d`, tone: "soon" };
}

// --- SSR-safe "now" clock via useSyncExternalStore -------------------------
// The server snapshot is null so SSR and the first client paint match
// (no hydration mismatch from the browser clock). After hydration the
// store subscribes to a 30s interval and re-renders with the real time.
const NOW_NULL = null as number | null;

function subscribeNow(callback: () => void) {
  const id = setInterval(callback, 30000);
  return () => clearInterval(id);
}
function getNowClient(): number | null {
  return Date.now();
}
function getNowServer(): number | null {
  return NOW_NULL;
}

/**
 * Real-time event state chip — “Live now” / “Starts in 2h 15m” / “Event ended”.
 * Computed client-side only after mount, so the server render can never
 * mismatch the browser clock; re-evaluates every 30 seconds.
 */
export function EventStatusChip({ startsAt, endsAt, liveStatus, className }: EventStatusChipProps) {
  const now = useSyncExternalStore(subscribeNow, getNowClient, getNowServer);

  const state = now == null ? null : computeStatus(startsAt, endsAt, Boolean(liveStatus), new Date(now));
  if (!state) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider backdrop-blur",
        state.tone === "live" && "border-emerald-500/40 bg-emerald-500/15 text-emerald-200",
        state.tone === "soon" && "border-sky-400/30 bg-sky-500/10 text-sky-200",
        state.tone === "over" && "border-white/15 bg-white/10 text-white/60",
        className,
      )}
    >
      {state.tone === "live" ? (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
        </span>
      ) : (
        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      )}
      {state.text}
    </span>
  );
}
