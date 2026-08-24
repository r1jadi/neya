"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { GUIDE_LOCATION_TYPES, DURATION_PRESETS } from "@/lib/guides/constants";
import type { GuideCategory } from "@/types/guides";
import { cn } from "@/lib/utils";

const CATEGORY_LABELS: Record<GuideCategory, string> = {
  nightlife: "🌙 Nightlife",
  food: "🍽 Food",
  culture: "🏛 Culture",
  nature: "🌿 Nature",
  adventure: "⛰ Adventure",
  family_friendly: "👪 Family",
};

export function GuideFilters({ availableCategories }: { availableCategories: GuideCategory[] }) {
  const router = useRouter();
  const params = useSearchParams();

  const category = (params.get("category") as GuideCategory | null) ?? "";
  const location = params.get("location") ?? "";
  const duration = params.get("duration") ?? "";

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/guides?${next.toString()}`);
  }

  function clearAll() {
    router.push("/guides");
  }

  const hasActive = Boolean(category || location || duration || params.get("maxPrice") || params.get("featured") || params.get("family"));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-300/90">Browse by vibe</p>
        {hasActive ? (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs font-semibold text-sky-300 transition hover:text-sky-200"
          >
            Clear filters
          </button>
        ) : null}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => update("category", "")}
          aria-pressed={!category}
          className={cn(
            "whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition",
            !category
              ? "border-fuchsia-400/60 bg-fuchsia-500/15 text-fuchsia-100"
              : "border-white/15 text-white/65 hover:border-fuchsia-400/40 hover:text-white",
          )}
        >
          All
        </button>
        {availableCategories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => update("category", category === c ? "" : c)}
            aria-pressed={category === c}
            className={cn(
              "whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition",
              category === c
                ? "border-fuchsia-400/60 bg-fuchsia-500/15 text-fuchsia-100"
                : "border-white/15 text-white/65 hover:border-fuchsia-400/40 hover:text-white",
            )}
          >
            {CATEGORY_LABELS[c] ?? c.replace(/_/g, " ")}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={location}
          onChange={(e) => update("location", e.target.value)}
          aria-label="Location"
          className="h-9 rounded-full border border-white/15 bg-black/40 px-3 text-sm text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          <option value="">All locations</option>
          {GUIDE_LOCATION_TYPES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
        <select
          value={duration}
          onChange={(e) => update("duration", e.target.value)}
          aria-label="Duration"
          className="h-9 rounded-full border border-white/15 bg-black/40 px-3 text-sm text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          <option value="">Any length</option>
          {DURATION_PRESETS.map((d) => (
            <option key={d.label} value={String(d.days)}>
              {d.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
