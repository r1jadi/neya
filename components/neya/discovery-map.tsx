"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Crosshair, MapPin, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { AnimatedMap, type MapMarker } from "@/components/neya/animated-map";
import { MapPreviewCard } from "@/components/neya/map-preview-card";
import { TonightTimeline } from "@/components/neya/tonight-timeline";
import { isHappeningNow, isOnThisWeekend, isTonight, CITY_TZ } from "@/lib/event-dates";
import { useI18n } from "@/lib/i18n";
import type { Event, Venue } from "@/types";
import { cn } from "@/lib/utils";
import { trackDiscoveryMetric } from "@/actions/discovery-analytics";

type Bounds = { west: number; south: number; east: number; north: number };
type QuickFilter = "all" | "tonight" | "live" | "weekend";
type TypeFilter = "all" | "events" | "venues";

const VENUE_CATEGORY_LABEL: Record<string, string> = {
  nightclub: "Clubs",
  club: "Clubs",
  bar: "Bars",
  lounge: "Lounges",
  rooftop: "Rooftops",
  cafe: "Cafés",
  live_music: "Live music",
  festival: "Festivals",
  pub: "Pubs",
  cocktail_bar: "Cocktails",
  jazz_club: "Jazz",
};

function inside(marker: MapMarker, bounds: Bounds) {
  return marker.lng >= bounds.west && marker.lng <= bounds.east && marker.lat >= bounds.south && marker.lat <= bounds.north;
}

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function distanceLabel(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

function boundsDiffer(a: Bounds, b: Bounds): boolean {
  const eps = 1e-4;
  return Math.abs(a.west - b.west) > eps || Math.abs(a.east - b.east) > eps || Math.abs(a.north - b.north) > eps || Math.abs(a.south - b.south) > eps;
}

interface DiscoveryMapProps {
  events: Event[];
  venues: Venue[];
  savedEventIds?: string[];
}

export function DiscoveryMap({ events, venues, savedEventIds }: DiscoveryMapProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [quick, setQuick] = useState<QuickFilter>("all");
  const [type, setType] = useState<TypeFilter>("all");
  const [category, setCategory] = useState<string | null>(null);
  const [genre, setGenre] = useState<string | null>(null);
  const [freeOnly, setFreeOnly] = useState(false);
  const [hourFilter, setHourFilter] = useState<number | null>(null);

  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [appliedBounds, setAppliedBounds] = useState<Bounds | null>(null);
  const [areaOnly, setAreaOnly] = useState(false);

  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; nonce: number } | null>(null);

  const [selected, setSelected] = useState<MapMarker | null>(null);
  const [sheet, setSheet] = useState<"collapsed" | "list" | "card">("collapsed");
  const [dismissedEmpty, setDismissedEmpty] = useState(false);

  const nonce = useRef(0);

  const onBoundsChange = useCallback((next: Bounds) => setBounds(next), []);

  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    for (const venue of venues) if (venue.category) set.add(venue.category);
    return [...set]
      .filter((category) => VENUE_CATEGORY_LABEL[category])
      .sort((a, b) => VENUE_CATEGORY_LABEL[a].localeCompare(VENUE_CATEGORY_LABEL[b]));
  }, [venues]);

  const availableGenres = useMemo(() => {
    const counts = new Map<string, number>();
    for (const event of events) {
      if (event.genre && event.genre !== "other") counts.set(event.genre, (counts.get(event.genre) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([genre]) => genre);
  }, [events]);

  const freeCount = useMemo(() => events.filter((e) => e.is_free).length, [events]);

  const tonightByVenue = useMemo(() => {
    const map = new Map<string, Event>();
    for (const event of events) {
      if (!event.venue) continue;
      if (!map.has(event.venue.id)) map.set(event.venue.id, event);
    }
    return map;
  }, [events]);

  const markers = useMemo<MapMarker[]>(() => {
    const q = query.trim().toLowerCase();
    const matches = (values: Array<string | undefined>) => !q || values.some((value) => value?.toLowerCase().includes(q));

    const eventMarkers: MapMarker[] =
      type === "venues"
        ? []
        : events.flatMap((event) => {
            if (event.venue?.lat == null || event.venue?.lng == null) return [];
            if (quick === "tonight" && !isTonight(event.starts_at)) return [];
            if (quick === "live" && !(isHappeningNow(event.starts_at, event.ends_at) && event.live_status)) return [];
            if (quick === "weekend" && !isOnThisWeekend(event.starts_at)) return [];
            if (category && event.category !== category) return [];
            if (genre && event.genre !== genre) return [];
            if (freeOnly && !event.is_free) return [];
            if (hourFilter != null && cityHour(event.starts_at) !== hourFilter) return [];
            if (!matches([event.title, event.venue?.name, event.genre, event.category, event.city_slug])) return [];
            return [
              {
                lat: event.venue.lat,
                lng: event.venue.lng,
                slug: event.slug,
                title: event.title,
                kind: "event" as const,
                href: `/events/${event.slug}`,
                is_live: event.live_status,
                category: event.category,
                crowd_count: event.crowd_count,
                atmosphere_rating: event.atmosphere_rating,
              },
            ];
          });

    const venueMarkers: MapMarker[] =
      type === "events"
        ? []
        : venues.flatMap((venue) => {
            if (venue.lat == null || venue.lng == null) return [];
            if (quick === "tonight" && !tonightByVenue.has(venue.id)) return [];
            if (quick === "live" && !venue.is_live) return [];
            if (quick === "weekend" && !tonightByVenue.has(venue.id)) return [];
            if (category && venue.category !== category) return [];
            if (freeOnly) return [];
            if (!matches([venue.name, venue.category, venue.address, venue.city_slug, ...(venue.music_genres ?? [])])) return [];
            return [
              {
                lat: venue.lat,
                lng: venue.lng,
                slug: venue.slug,
                title: venue.name,
                kind: "venue" as const,
                href: `/venues/${venue.slug}`,
                is_live: venue.is_live,
                category: venue.category,
                crowd_count: venue.crowd_count ?? 0,
              },
            ];
          });

    let all = [...eventMarkers, ...venueMarkers];
    if (areaOnly && appliedBounds) all = all.filter((marker) => inside(marker, appliedBounds));
    if (location) {
      all = all
        .map((marker) => ({ marker, distance: distanceKm(location, marker) }))
        .filter((item) => item.distance <= 25)
        .sort((a, b) => a.distance - b.distance)
        .map((item) => item.marker);
    }
    return all.slice(0, 200);
  }, [events, venues, query, quick, type, category, genre, freeOnly, hourFilter, areaOnly, appliedBounds, location, tonightByVenue]);

  const mapMovedSinceSearch = useMemo(() => {
    if (!bounds) return false;
    if (!areaOnly) return false;
    if (!appliedBounds) return true;
    return boundsDiffer(bounds, appliedBounds);
  }, [bounds, appliedBounds, areaOnly]);

  const eventById = useMemo(() => new Map(events.map((event) => [event.slug, event])), [events]);
  const venueBySlug = useMemo(() => new Map(venues.map((venue) => [venue.slug, venue])), [venues]);

  const selectedEvent = selected?.kind === "event" ? eventById.get(selected.slug) : null;
  const selectedVenue = selected?.kind === "venue" ? venueBySlug.get(selected.slug) : null;

  const onSelectMarker = useCallback(
    (marker: MapMarker) => {
      setSelected(marker);
      setFlyTo({ lat: marker.lat, lng: marker.lng, nonce: ++nonce.current });
      setSheet("card");
      void trackDiscoveryMetric("map_interaction", {
        dimensions: { action: "select_pin", kind: marker.kind ?? "event" },
        eventId: marker.kind === "event" ? events.find((event) => event.slug === marker.slug)?.id : undefined,
        venueId: marker.kind === "venue" ? venues.find((venue) => venue.slug === marker.slug)?.id : undefined,
      });
    },
    [events, venues],
  );

  function applySearchThisArea() {
    if (!bounds) return;
    setAppliedBounds(bounds);
    setAreaOnly(true);
    setDismissedEmpty(false);
    void trackDiscoveryMetric("map_interaction", { dimensions: { action: "search_area" } });
  }

  function requestLocation() {
    if (!navigator.geolocation) {
      setLocationError("Location isn’t available on this browser.");
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = { lat: position.coords.latitude, lng: position.coords.longitude };
        setLocation(next);
        setAppliedBounds(null);
        setAreaOnly(false);
        setFlyTo({ ...next, nonce: ++nonce.current });
        setLocationError(null);
        setLocating(false);
        void trackDiscoveryMetric("map_interaction", { dimensions: { action: "nearby" } });
      },
      () => {
        setLocationError("We couldn’t get your location. Check permissions and try again.");
        setLocating(false);
      },
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 10000 },
    );
  }

  function clearFilters() {
    setQuery("");
    setQuick("all");
    setType("all");
    setCategory(null);
    setGenre(null);
    setFreeOnly(false);
    setHourFilter(null);
    setAreaOnly(false);
    setAppliedBounds(null);
    setSelected(null);
    setDismissedEmpty(false);
  }

  const resultsCount = markers.length;
  const hasAnyFilters = query.trim() !== "" || quick !== "all" || type !== "all" || category != null || genre != null || freeOnly || hourFilter != null || areaOnly;

  return (
    <section className="mt-6">
      {/* Compact search + time-aware quick filters */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-white/35" />
            <span className="sr-only">{t.mapPage.searchVenuesEvents}</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t.mapPage.searchVenuesEvents}
              className="h-10 w-full rounded-xl border border-white/10 bg-black/40 pl-9 pr-3 text-sm text-white placeholder:text-white/35"
            />
          </label>
          <button
            type="button"
            onClick={requestLocation}
            disabled={locating}
            className={cn(
              "inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-medium transition",
              location ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-100" : "border-white/15 text-white/75 hover:border-sky-400/40",
            )}
          >
            <Crosshair className={cn("h-4 w-4", locating && "animate-spin")} />
            {location ? t.mapPage.nearMe : t.mapPage.findNearby}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {(
            [
              ["all", t.mapPage.all],
              ["tonight", `🌙 ${t.mapPage.tonight}`],
              ["live", `🔴 ${t.mapPage.liveNow}`],
              ["weekend", t.mapPage.thisWeekend],
            ] as [QuickFilter, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setQuick(id);
                setSelected(null);
                void trackDiscoveryMetric("map_interaction", { dimensions: { action: "quick", mode: id } });
              }}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                quick === id ? "border-fuchsia-400/70 bg-fuchsia-500/15 text-fuchsia-100" : "border-white/15 text-white/65 hover:border-white/30 hover:text-white",
              )}
            >
              {label}
            </button>
          ))}
          <span className="mx-1 hidden h-6 w-px self-center bg-white/10 sm:block" />
          {(["all", "events", "venues"] as TypeFilter[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setType(id);
                setSelected(null);
              }}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs capitalize transition",
                type === id ? "border-sky-400/70 bg-sky-500/15 text-sky-100" : "border-white/15 text-white/60 hover:border-white/30 hover:text-white",
              )}
            >
              {id === "all" ? t.mapPage.eventsAndVenues : id === "events" ? t.mapPage.eventsOnly : t.mapPage.venuesOnly}
            </button>
          ))}
        </div>

        {(availableCategories.length || availableGenres.length || freeCount > 0) ? (
          <div className="mt-2 flex flex-wrap items-center gap-1 border-t border-white/5 pt-2">
            <SlidersHorizontal className="mr-1 h-3.5 w-3.5 text-white/30" />
            {availableCategories.map((catId) => (
              <button
                key={catId}
                type="button"
                onClick={() => {
                  setCategory(category === catId ? null : catId);
                  setSelected(null);
                }}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs transition",
                  category === catId ? "border-sky-400/70 bg-sky-500/15 text-sky-100" : "border-white/10 text-white/55 hover:border-white/30 hover:text-white",
                )}
              >
                {VENUE_CATEGORY_LABEL[catId]}
              </button>
            ))}
            {availableGenres.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => {
                  setGenre(genre === g ? null : g);
                  setSelected(null);
                }}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs capitalize transition",
                  genre === g ? "border-fuchsia-400/70 bg-fuchsia-500/15 text-fuchsia-100" : "border-white/10 text-white/55 hover:border-white/30 hover:text-white",
                )}
              >
                {g.replace(/_/g, " ")}
              </button>
            ))}
            {freeCount > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setFreeOnly((value) => !value);
                  setSelected(null);
                }}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-semibold transition",
                  freeOnly ? "border-emerald-400/70 bg-emerald-500/15 text-emerald-100" : "border-white/10 text-white/55 hover:border-white/30 hover:text-white",
                )}
              >
                Free
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Timeline */}
      <div className="mt-4">
        <TonightTimeline events={events} activeHour={hourFilter} onPickHour={setHourFilter} />
      </div>

      {/* Map + preview card + bottom sheet + overlays */}
      <div className="relative mt-4">
        <AnimatedMap
          className="shadow-2xl"
          center={[21.1655, 42.6629]}
          markers={markers}
          selectedKey={selected ? `${selected.kind}:${selected.slug}` : null}
          flyTo={flyTo}
          onBoundsChange={onBoundsChange}
          onSelectMarker={onSelectMarker}
        />

        {/* Desktop preview card */}
        <AnimatePresence>
          {selected && (selectedEvent || selectedVenue) ? (
            <motion.div
              key={selected.slug}
              initial={{ opacity: 0, y: 14, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="absolute right-3 top-3 z-20 hidden w-[300px] md:block"
            >
              <MapPreviewCard
                kind={selected.kind ?? "event"}
                event={selectedEvent}
                venue={selectedVenue}
                venueTonight={selectedVenue ? tonightByVenue.get(selectedVenue.id) ?? null : null}
                distanceKm={location ? distanceKm(location, selected) : undefined}
                saved={selectedEvent ? savedEventIds?.includes(selectedEvent.id) : undefined}
              />
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-zinc-900 text-xs text-white/80 transition hover:text-white"
                aria-label="Close preview"
              >
                ✕
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Search this area — only after the user moves the map */}
        <button
          type="button"
          onClick={applySearchThisArea}
          disabled={!bounds}
          className={cn(
            "absolute bottom-6 left-1/2 z-20 hidden -translate-x-1/2 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold shadow-xl backdrop-blur-xl transition md:inline-flex",
            mapMovedSinceSearch
              ? "border-fuchsia-400/60 bg-zinc-950/90 text-fuchsia-100"
              : "border-white/15 bg-zinc-950/80 text-white/70",
            !bounds && "pointer-events-none opacity-40",
          )}
        >
          <RotateCcw className={cn("h-4 w-4", mapMovedSinceSearch && "animate-[spin_3s_linear_infinite]")} />
          Search this area
        </button>

        {/* Map-wide empty state */}
        <AnimatePresence>
          {!markers.length && !dismissedEmpty ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-x-0 top-8 z-20 flex justify-center px-4"
            >
              <div className="pointer-events-auto max-w-md rounded-2xl border border-white/10 bg-zinc-950/90 px-5 py-4 text-center shadow-2xl backdrop-blur-xl">
                <p className="font-[family-name:var(--font-display)] text-lg font-bold text-white">Nothing here right now 👀</p>
                <p className="mt-1 text-sm text-white/55">No events or venues match here — try another spot or loosen the filters.</p>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setQuick("tonight");
                      setSelected(null);
                    }}
                    className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-white/90"
                  >
                    Explore tonight
                  </button>
                  <button type="button" onClick={clearFilters} className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:border-white/40 hover:text-white">
                    Remove filters
                  </button>
                  <button type="button" onClick={() => { setAreaOnly(false); setAppliedBounds(null); }} className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:border-white/40 hover:text-white">
                    Search another area
                  </button>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Mobile bottom sheet */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 md:hidden">
          <motion.div
            drag="y"
            dragConstraints={{ top: -320, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.08 }}
            onDragEnd={(_, info) => {
              if (info.offset.y < -80) setSheet("list");
              else if (info.offset.y > 80) setSheet("collapsed");
            }}
            animate={{ y: sheet === "collapsed" ? 0 : sheet === "list" ? -240 : -280 }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
            className="pointer-events-auto mx-3 rounded-t-2xl border border-b-0 border-white/10 bg-zinc-950/95 pb-4 shadow-[0_-20px_60px_rgba(0,0,0,0.6)] backdrop-blur-xl"
            style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
          >
            <div className="flex justify-center pt-2.5 pb-1">
              <button
                type="button"
                onClick={() => setSheet(sheet === "collapsed" ? "list" : "collapsed")}
                aria-label={sheet === "collapsed" ? "Expand results" : "Collapse results"}
                className="h-1.5 w-10 rounded-full bg-white/25"
              />
            </div>
            <div className="px-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-white">
                  {resultsCount} {resultsCount === 1 ? t.mapPage.place : t.mapPage.placesNearby} nearby
                </p>
                {hasAnyFilters ? (
                  <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1 text-xs font-semibold text-sky-300 hover:text-sky-200">
                    <SlidersHorizontal className="h-3.5 w-3.5" /> Clear
                  </button>
                ) : null}
              </div>
              {sheet !== "collapsed" ? (
                <div className="mt-2 max-h-[300px] overflow-y-auto pb-2">
                {sheet !== "card" ? (
                  markers.length ? (
                    <ul className="space-y-2">
                      {markers.slice(0, 18).map((marker) => (
                        <li key={`${marker.kind}:${marker.slug}`}>
                          <button
                            type="button"
                            onClick={() => {
                              onSelectMarker(marker);
                              setSheet("card");
                            }}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-left transition",
                              selected && `${selected.kind}:${selected.slug}` === `${marker.kind}:${marker.slug}`
                                ? "border-fuchsia-400/50 bg-fuchsia-500/10"
                                : "hover:border-sky-400/35 hover:bg-white/[0.06]",
                            )}
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15 bg-zinc-900 text-sm">
                              {marker.kind === "event" ? "🎵" : marker.category ? venueGlyph(marker.category) : "✨"}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-white">{marker.title}</span>
                              <span className="block truncate text-xs text-white/45">
                                {marker.kind === "event"
                                  ? marker.is_live
                                    ? "Live now"
                                    : "event"
                                  : marker.is_live
                                    ? "Live venue"
                                    : marker.category?.replace(/_/g, " ")}
                                {location ? ` · ${distanceLabel(distanceKm(location, marker))}` : ""}
                              </span>
                            </span>
                            {marker.kind === "event" && marker.atmosphere_rating != null && marker.atmosphere_rating > 0 ? (
                              <span className="shrink-0 text-xs font-semibold text-sky-300">
                                <span aria-hidden>⭐</span> {marker.atmosphere_rating.toFixed(1)}
                              </span>
                            ) : null}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="py-4 text-center text-xs text-white/40">No results — try clearing filters.</p>
                  )
                ) : selected && (selectedEvent || selectedVenue) ? (
                  <MapPreviewCard
                    kind={selected.kind ?? "event"}
                    event={selectedEvent}
                    venue={selectedVenue}
                    venueTonight={selectedVenue ? tonightByVenue.get(selectedVenue.id) ?? null : null}
                    distanceKm={location ? distanceKm(location, selected) : undefined}
                    saved={selectedEvent ? savedEventIds?.includes(selectedEvent.id) : undefined}
                  />
                ) : null}
                </div>
              ) : null}
              </div>
          </motion.div>
        </div>

        {/* Location error toast */}
        <AnimatePresence>
          {locationError ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute left-1/2 top-4 z-30 -translate-x-1/2 rounded-full border border-amber-400/40 bg-zinc-950/95 px-4 py-2 text-xs text-amber-100 shadow-xl backdrop-blur-xl"
            >
              <div className="flex items-center gap-3">
                <span>{locationError}</span>
                <button type="button" onClick={requestLocation} className="font-semibold text-sky-300 hover:text-sky-200">
                  Try again
                </button>
                <button type="button" onClick={() => setLocationError(null)} aria-label="Dismiss" className="text-white/40 hover:text-white">
                  ✕
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Result list — desktop */}
      <div className="mt-4 hidden gap-2 md:grid md:grid-cols-2 lg:grid-cols-3">
        {markers.slice(0, 18).map((marker) => (
          <button
            key={`${marker.kind}:${marker.slug}`}
            type="button"
            onClick={() => onSelectMarker(marker)}
            className={cn(
              "flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/75 transition",
              selected && `${selected.kind}:${selected.slug}` === `${marker.kind}:${marker.slug}`
                ? "border-fuchsia-400/50 bg-fuchsia-500/10 text-white"
                : "hover:border-sky-400/35 hover:text-white",
            )}
          >
            <MapPin className="h-4 w-4 shrink-0 text-sky-300" />
            <span className="truncate">{marker.title}</span>
            {marker.kind === "event" && marker.atmosphere_rating != null && marker.atmosphere_rating > 0 ? (
              <span className="ml-auto shrink-0 text-xs font-semibold text-sky-300">
                <span aria-hidden>⭐</span> {marker.atmosphere_rating.toFixed(1)}
              </span>
            ) : marker.is_live ? (
              <span className="ml-auto shrink-0 inline-flex items-center gap-1 text-xs font-bold text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> LIVE
              </span>
            ) : null}
            {location ? <span className="ml-auto shrink-0 text-xs text-white/40">{distanceLabel(distanceKm(location, marker))}</span> : null}
          </button>
        ))}
      </div>
      {!markers.length ? (
        <p className="mt-4 hidden text-sm text-white/45 md:block">No mapped events or venues match these filters.</p>
      ) : null}
    </section>
  );
}

function cityHour(iso: string): number {
  const part = new Intl.DateTimeFormat("en-GB", { timeZone: CITY_TZ, hour: "numeric", hour12: false })
    .formatToParts(new Date(iso))
    .find((p) => p.type === "hour")?.value;
  const n = parseInt(part ?? "0", 10);
  return n === 24 ? 0 : n;
}

function venueGlyph(category: string): string {
  const map: Record<string, string> = {
    rooftop: "🌅",
    nightclub: "🪩",
    club: "🪩",
    bar: "🍸",
    cafe: "☕",
    pub: "🍺",
    jazz_club: "🎶",
    live_music: "🎤",
    festival: "🎉",
  };
  return map[category] ?? "✨";
}