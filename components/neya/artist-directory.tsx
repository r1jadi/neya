"use client";

import { useMemo, useState } from "react";
import { Search, SearchX } from "lucide-react";
import { ArtistCard } from "@/components/neya/artist-card";
import { EmptyState } from "@/components/neya/empty-state";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import type { Artist } from "@/types";

interface ArtistDirectoryProps {
  artists: Artist[];
  followedIds: string[];
  className?: string;
}

export function ArtistDirectory({ artists, followedIds, className }: ArtistDirectoryProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState<string | null>(null);
  const followed = useMemo(() => new Set(followedIds), [followedIds]);

  // Genre chips are derived from the actual data, so new genres appear
  // automatically — no hardcoded list to keep in sync.
  const genreCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const artist of artists) {
      for (const g of artist.genres) counts.set(g, (counts.get(g) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 12);
  }, [artists]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return artists.filter((artist) => {
      if (genre && !artist.genres.includes(genre)) return false;
      if (!q) return true;
      return (
        artist.name.toLowerCase().includes(q) ||
        artist.short_bio?.toLowerCase().includes(q) ||
        artist.genres.some((g) => g.toLowerCase().includes(q))
      );
    });
  }, [artists, query, genre]);

  const hasFilters = query.trim() !== "" || genre !== null;

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.artistsPage.searchPlaceholder}
            aria-label={t.artistsPage.searchLabel}
            className="pl-10"
          />
        </div>
        {filtered.length > 0 ? (
          <p className="text-xs text-white/45">
            {filtered.length} {filtered.length === 1 ? t.artistsPage.artist : t.artistsPage.artists}
            {genre ? ` ${t.artistsPage.inGenre.replace("{genre}", genre)}` : ""}
          </p>
        ) : null}
      </div>

      {genreCounts.length ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setGenre(null)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition",
              genre === null
                ? "border-white bg-white text-black"
                : "border-white/15 text-white/60 hover:text-white",
            )}
          >
            {t.actions.all}
          </button>
          {genreCounts.map(([g, count]) => (
            <button
              key={g}
              type="button"
              onClick={() => setGenre(genre === g ? null : g)}
              aria-pressed={genre === g}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                genre === g
                  ? "border-fuchsia-400 bg-fuchsia-500/20 text-fuchsia-100"
                  : "border-white/15 text-white/60 hover:text-white",
              )}
            >
              {g} · {count}
            </button>
          ))}
        </div>
      ) : null}

      {filtered.length ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((artist) => (
            <ArtistCard
              key={artist.id}
              artist={artist}
              initialFollowing={followed.has(artist.id)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<SearchX className="h-8 w-8" />}
          title={hasFilters ? t.artistsPage.noMatch : t.artistsPage.noArtists}
          description={hasFilters ? t.artistsPage.noMatchDesc : t.artistsPage.noArtistsDesc}
        />
      )}
    </div>
  );
}
