"use client";

import Link from "next/link";
import { MapPinned } from "lucide-react";
import { useMyNight } from "@/components/my-night/my-night-provider";

export function MyNightEntry() {
  const { hydrated, stops } = useMyNight();

  if (!hydrated) return null;

  const hasStops = stops.length > 0;

  return (
    <section className="mx-auto w-full min-w-0 max-w-6xl px-4 pb-10 sm:px-6">
      <Link
        href="/my-night"
        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-fuchsia-500/25 bg-gradient-to-r from-fuchsia-950/40 via-zinc-950/60 to-sky-950/40 px-4 py-3.5 transition hover:border-fuchsia-400/40"
      >
        <span className="flex items-center gap-2.5 text-sm font-semibold text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-sky-500">
            <MapPinned className="h-4 w-4 text-black" />
          </span>
          {hasStops ? `My Night · ${stops.length} stop${stops.length === 1 ? "" : "s"}` : "My Night · build your route"}
        </span>
        <span className="text-sm font-medium text-sky-300">{hasStops ? "Continue planning →" : "Start planning →"}</span>
      </Link>
    </section>
  );
}
