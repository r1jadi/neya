"use client";

import Link from "next/link";
import { ArrowRight, MapPinned } from "lucide-react";
import { useMyNight } from "@/components/my-night/my-night-provider";

export function MyNightEntry() {
  const { hydrated, stops } = useMyNight();

  if (!hydrated) return null;

  const hasStops = stops.length > 0;
  const preview = stops.map((s) => s.title).join("  →  ");

  return (
    <section className="mx-auto w-full min-w-0 max-w-6xl px-4 pb-10 sm:px-6">
      <Link
        href="/my-night"
        className="group flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-fuchsia-500/25 bg-gradient-to-r from-fuchsia-950/40 via-zinc-950/60 to-sky-950/40 px-4 py-3.5 transition hover:border-fuchsia-400/40"
      >
        <span className="flex min-w-0 items-center gap-2.5 text-sm font-semibold text-white">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-sky-500">
            <MapPinned className="h-4 w-4 text-black" />
          </span>
          <span className="min-w-0">
            <span className="block">
              {hasStops ? `My Night · ${stops.length} stop${stops.length === 1 ? "" : "s"}` : "My Night"}
            </span>
            {hasStops ? (
              <span className="mt-0.5 block truncate text-xs font-normal text-sky-200/80 sm:max-w-md">
                {preview}
              </span>
            ) : (
              <span className="mt-0.5 block text-xs font-normal text-white/50">
                Plan your night in 3 stops
              </span>
            )}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-sky-300 transition group-hover:gap-2">
          {hasStops ? "Open My Night" : "Plan your night"}
          <ArrowRight className="h-4 w-4" />
        </span>
      </Link>
    </section>
  );
}