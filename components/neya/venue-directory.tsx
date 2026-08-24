"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { VenueCard } from "@/components/neya/venue-card";
import { EmptyState } from "@/components/neya/empty-state";
import { VENUE_CATEGORIES, type Venue } from "@/types";
import type { Event } from "@/types";
import { cn } from "@/lib/utils";

type Props = {
  venues: Venue[];
  /** First upcoming event per venue (for the "Tonight" line on cards). */
  tonightByVenue: Record<string, Event | null>;
  savedVenueIds: string[];
};

function venueMatchesQuery(venue: Venue, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return [venue.name, venue.address, venue.category, ...(venue.music_genres ?? [])]
    .filter((value): value is string => Boolean(value))
    .some((value) => value.toLowerCase().includes(normalized));
}

export function VenueDirectory({ venues, tonightByVenue, savedVenueIds }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const categories = useMemo(() => {
    const present = new Set(venues.map((v) => v.category));
    return VENUE_CATEGORIES.filter((c) => present.has(c.id));
  }, [venues]);

  const filtered = useMemo(
    () =>
      venues.filter(
        (venue) => (!category || venue.category === category) && venueMatchesQuery(venue, query),
      ),
    [venues, category, query],
  );

  return (
    <div className="mt-8">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-white/35" />
          <span className="sr-only">Search venues</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search venues by name, area or music…"
            className="h-10 w-full rounded-xl border border-white/10 bg-black/40 pl-9 pr-3 text-sm text-white placeholder:text-white/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          />
        </label>
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setCategory(null)}
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
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategory(category === c.id ? null : c.id)}
            aria-pressed={category === c.id}
            className={cn(
              "whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition",
              category === c.id
                ? "border-fuchsia-400/60 bg-fuchsia-500/15 text-fuchsia-100"
                : "border-white/15 text-white/65 hover:border-fuchsia-400/40 hover:text-white",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      <p className="mt-4 text-xs text-white/45">
        {filtered.length} {filtered.length === 1 ? "venue" : "venues"} · Prishtina
      </p>

      {filtered.length ? (
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((venue) => (
            <VenueCard
              key={venue.id}
              venue={venue}
              tonight={tonightByVenue[venue.id] ?? null}
              saved={savedVenueIds.includes(venue.id)}
            />
          ))}
        </div>
      ) : (
        <div className="mt-8">
          <EmptyState
            title="No venues match that"
            description="Try a different search or category — every approved venue in Prishtina is listed here."
            icon={<Search className="h-10 w-10" />}
          />
        </div>
      )}
    </div>
  );
}

