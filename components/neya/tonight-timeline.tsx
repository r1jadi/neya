"use client";

import { useMemo, useSyncExternalStore } from "react";
import { isTonight } from "@/lib/event-dates";
import { CITY_TZ } from "@/lib/event-dates";
import type { Event } from "@/types";
import { cn } from "@/lib/utils";

// SSR-safe clock: server snapshot is null so first client paint matches SSR
// (no hydration mismatch), then re-subscribes to a 60s tick on the client.
function subscribeClock(callback: () => void) {
  const id = setInterval(callback, 60000);
  return () => clearInterval(id);
}
function getClockClient(): number | null {
  return Date.now();
}
function getClockServer(): number | null {
  return null;
}

interface TonightTimelineProps {
  events: Event[];
  /** Hour (0–23) currently pinned — optional. */
  activeHour?: number | null;
  onPickHour?: (hour: number | null) => void;
}

function hourOf(iso: string): number {
  const part = new Intl.DateTimeFormat("en-GB", { timeZone: CITY_TZ, hour: "numeric", hour12: false }).formatToParts(new Date(iso)).find((p) => p.type === "hour")?.value;
  const n = parseInt(part ?? "0", 10);
  return n === 24 ? 0 : n;
}

/**
 * “Tonight in Prishtina” — generated from real event start times. The busiest
 * hour is labelled Peak, the earliest Warming up, the latest hours Late night.
 * Hidden entirely when there aren’t enough events to be meaningful.
 */
export function TonightTimeline({ events, activeHour, onPickHour }: TonightTimelineProps) {
  // `now` is null on the server and first paint, then a real timestamp.
  // Until it resolves we render nothing — the timeline is a live, time-aware
  // widget and a server-rendered (wrong) version would cause hydration drift.
  const now = useSyncExternalStore(subscribeClock, getClockClient, getClockServer);
  const buckets = useMemo(() => {
    if (now == null) return null;
    const tonight = events.filter((e) => isTonight(e.starts_at) && new Date(e.starts_at).getTime() > now - 6 * 3600000);
    if (tonight.length < 2) return null;
    const byHour = new Map<number, Event[]>();
    for (const event of tonight) {
      const hour = hourOf(event.starts_at);
      const list = byHour.get(hour) ?? [];
      list.push(event);
      byHour.set(hour, list);
    }
    const sorted = [...byHour.entries()].sort((a, b) => a[0] - b[0]);
    if (sorted.length < 2) return null;
    const max = Math.max(...sorted.map(([, list]) => list.length));
    return sorted.map(([hour, list], index) => {
      let label = "Getting busy";
      if (index === 0) label = "Warming up";
      else if (list.length === max && hour >= 21) label = "🔥 Peak";
      else if (hour >= 23) label = "Late night";
      else if (hour >= 21) label = "Peak building";
      return { hour, count: list.length, label };
    });
  }, [events, now]);

  if (!buckets) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">Tonight in Prishtina</p>
        {activeHour != null ? (
          <button
            type="button"
            onClick={() => onPickHour?.(null)}
            className="text-xs font-semibold text-sky-300 hover:text-sky-200"
          >
            Show all
          </button>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {buckets.map((bucket) => {
          const active = activeHour === bucket.hour;
          return (
            <button
              key={bucket.hour}
              type="button"
              onClick={() => onPickHour?.(active ? null : bucket.hour)}
              aria-pressed={active}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                active
                  ? "border-sky-400/70 bg-sky-500/20 text-sky-100"
                  : "border-white/15 text-white/65 hover:border-sky-400/40 hover:text-white",
              )}
            >
              {String(bucket.hour).padStart(2, "0")}:00 · {bucket.label}
              <span className="ml-1.5 text-white/45">{bucket.count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}