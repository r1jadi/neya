"use client";

import { useMemo, useState } from "react";
import { Search, SearchX } from "lucide-react";
import { EventCard } from "@/components/neya/event-card";
import { EmptyState } from "@/components/neya/empty-state";
import type { Event } from "@/types";
import { cn } from "@/lib/utils";

interface EventFeedProps {
  events: Event[];
  savedEventIds: string[];
}

/**
 * Client-side discovery over the server-rendered tonight list: instant
 * text search plus venue-category chips. No reloads, no query-string churn.
 */
export function EventFeed({ events, savedEventIds }: EventFeedProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const categories = useMemo(() => {
    const seen = new Set<string>();
    for (const e of events) {
      const c = e.venue?.category?.trim();
      if (c) seen.add(c);
    }
    return [...seen].sort();
  }, [events]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((e) => {
      if (category && e.venue?.category !== category) return false;
      if (!q) return true;
      return [e.title, e.venue?.name, e.genre, e.venue?.category]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q));
    });
  }, [events, query, category]);

  const hasFilters = query.trim().length > 0 || category !== null;

  return (
    <div className="mt-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative block flex-1">
          <span className="sr-only">Search events</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tonight's events, venues, genres…"
            className="h-11 w-full rounded-xl border border-white/10 bg-black/40 pl-10 pr-4 text-sm text-white shadow-inner transition-colors placeholder:text-white/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          />
        </label>
        {categories.length > 1 ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategory(null)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                category === null
                  ? "border-sky-400/60 bg-sky-500/10 text-sky-100"
                  : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10",
              )}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(category === c ? null : c)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition",
                  category === c
                    ? "border-sky-400/60 bg-sky-500/10 text-sky-100"
                    : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10",
                )}
              >
                {c.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {filtered.length ? (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((e) => (
            <EventCard key={e.id} event={e} saved={savedEventIds.includes(e.id)} />
          ))}
        </div>
      ) : hasFilters ? (
        <EmptyState
          className="mt-6"
          title="No matches for that"
          description={
            category
              ? `Nothing in ${category.replace(/_/g, " ")} matches your search. Try another venue type or clear the filters.`
              : "No events match your search. Try a different name, venue, or genre."
          }
          icon={<SearchX className="h-10 w-10" />}
        />
      ) : null}

      {hasFilters && filtered.length ? (
        <p className="mt-4 text-xs text-white/45">
          {filtered.length} of {events.length} event{events.length === 1 ? "" : "s"}
          {category ? ` in ${category.replace(/_/g, " ")}` : ""}
          {query.trim() ? ` matching “${query.trim()}”` : ""}
        </p>
      ) : null}
    </div>
  );
}
