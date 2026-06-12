"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  GUIDE_FILTER_CATEGORIES,
  GUIDE_LOCATION_TYPES,
  DURATION_PRESETS,
} from "@/lib/guides/constants";

export function GuideFilters() {
  const router = useRouter();
  const params = useSearchParams();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/guides?${next.toString()}`);
  }

  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-300/90">Filter guides</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-1">
          <span className="text-xs text-white/50">Location</span>
          <select
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
            value={params.get("location") ?? ""}
            onChange={(e) => update("location", e.target.value)}
          >
            <option value="">All locations</option>
            {GUIDE_LOCATION_TYPES.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs text-white/50">Duration</span>
          <select
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
            value={params.get("duration") ?? ""}
            onChange={(e) => update("duration", e.target.value)}
          >
            <option value="">Any duration</option>
            {DURATION_PRESETS.map((d) => (
              <option key={d.label} value={String(d.days)}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs text-white/50">Max price (€)</span>
          <input
            type="number"
            min={0}
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
            value={params.get("maxPrice") ?? ""}
            onChange={(e) => update("maxPrice", e.target.value)}
            placeholder="Any"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-white/50">Category</span>
          <select
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
            value={params.get("category") ?? ""}
            onChange={(e) => update("category", e.target.value)}
          >
            <option value="">All categories</option>
            {GUIDE_FILTER_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap gap-3">
        <label className="flex items-center gap-2 text-sm text-white/70">
          <input
            type="checkbox"
            checked={params.get("featured") === "1"}
            onChange={(e) => update("featured", e.target.checked ? "1" : "")}
            className="rounded border-white/20"
          />
          Featured only
        </label>
        <label className="flex items-center gap-2 text-sm text-white/70">
          <input
            type="checkbox"
            checked={params.get("family") === "1"}
            onChange={(e) => update("family", e.target.checked ? "1" : "")}
            className="rounded border-white/20"
          />
          Family friendly
        </label>
      </div>
    </div>
  );
}
