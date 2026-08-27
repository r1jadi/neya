"use client";

import { useMemo, useState } from "react";
import { Coffee, Search, Sunrise, Moon, Laptop, UtensilsCrossed, Martini, Music, X } from "lucide-react";
import { VenueCard } from "@/components/neya/venue-card";
import { EmptyState } from "@/components/neya/empty-state";
import { VENUE_CATEGORIES, type Venue, type VenueCategory } from "@/types";
import type { Event } from "@/types";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

type DayPart = "morning" | "daytime" | "evening" | "lateNight";

type ContextId = "breakfast" | "coffee" | "lunch" | "workStudy" | "dinner" | "drinks" | "nightlife";

/** Typical times each context is alive — used to time-filter within a context. */
const CONTEXT_DAY_PARTS: Record<ContextId, DayPart[]> = {
  breakfast: ["morning"],
  coffee: ["morning", "daytime"],
  lunch: ["daytime"],
  workStudy: ["morning", "daytime"],
  dinner: ["evening"],
  drinks: ["evening", "lateNight"],
  nightlife: ["evening", "lateNight"],
};

/**
 * Which venue categories fit which context. Anything not listed still appears
 * under a context when its category matches a generic rule below (e.g. bars
 * → drinks + nightlife). `club` is the legacy nightlife alias.
 */
/** Context → venue categories that fit. Only VENUE_CATEGORIES ids are used. */
const CONTEXT_CATEGORIES: Record<ContextId, VenueCategory[]> = {
  breakfast: ["cafe", "restaurant", "hotel_venue", "resort", "food_hall"],
  coffee: ["cafe", "food_hall", "hotel_venue"],
  lunch: ["restaurant", "cafe", "pub", "food_hall", "hotel_venue", "resort"],
  workStudy: ["cafe", "university_venue", "conference_center", "community_space", "cultural_center"],
  dinner: ["restaurant", "pub", "wine_bar", "cocktail_bar", "rooftop", "rooftop_bar", "hotel_venue", "resort", "food_hall", "jazz_club", "theater"],
  drinks: ["bar", "pub", "cocktail_bar", "wine_bar", "rooftop", "rooftop_bar", "lounge", "jazz_club", "live_music", "music_venue", "nightclub", "club", "hotel_venue", "beach_club", "pool_club"],
  nightlife: ["nightclub", "club", "underground_venue", "clubbing_venue", "warehouse", "live_music", "music_venue", "jazz_club", "festival", "festival_ground", "open_air_venue"],
};

/** Category → day parts for the legacy/nightlife fallback. */
const FALLBACK_DAY_PARTS: Partial<Record<VenueCategory, DayPart[]>> = {
  cafe: ["morning", "daytime", "evening"],
  restaurant: ["daytime", "evening", "lateNight"],
  pub: ["daytime", "evening", "lateNight"],
  food_hall: ["morning", "daytime", "evening"],
  park: ["morning", "daytime", "evening"],
  gallery: ["morning", "daytime", "evening"],
  exhibition_space: ["morning", "daytime", "evening"],
  cultural_center: ["morning", "daytime", "evening"],
  community_space: ["morning", "daytime", "evening"],
  conference_center: ["morning", "daytime"],
  university_venue: ["morning", "daytime"],
  sports_venue: ["morning", "daytime", "evening"],
  outdoor_space: ["morning", "daytime", "evening"],
  cinema: ["daytime", "evening"],
  theater: ["evening", "lateNight"],
  rooftop: ["evening", "lateNight"],
  rooftop_bar: ["evening", "lateNight"],
  lounge: ["evening", "lateNight"],
  cocktail_bar: ["evening", "lateNight"],
  wine_bar: ["evening", "lateNight"],
  pool_club: ["morning", "daytime"],
  beach_club: ["morning", "daytime"],
  hotel_venue: ["morning", "daytime", "evening", "lateNight"],
  resort: ["morning", "daytime", "evening"],
  live_music: ["evening", "lateNight"],
  music_venue: ["evening", "lateNight"],
  jazz_club: ["evening", "lateNight"],
  bar: ["evening", "lateNight"],
  nightclub: ["lateNight"],
  club: ["lateNight"],
  underground_venue: ["lateNight"],
  clubbing_venue: ["lateNight"],
  warehouse: ["lateNight"],
  festival: ["daytime", "evening", "lateNight"],
  festival_ground: ["daytime", "evening", "lateNight"],
  open_air_venue: ["daytime", "evening", "lateNight"],
  event_hall: ["morning", "daytime", "evening"],
  wedding_venue: ["daytime", "evening"],
  private_venue: ["evening", "lateNight"],
  other: ["morning", "daytime", "evening", "lateNight"],
};

function categoryMatchesDayPart(category: VenueCategory, part: DayPart): boolean {
  const mapped = FALLBACK_DAY_PARTS[category];
  if (mapped) return mapped.includes(part);
  // Unknown categories default to late (NEYA's nightlife roots stay intact).
  return part === "lateNight";
}

const DAY_PART_FOR_CONTEXT: Record<ContextId, DayPart[]> = {
  breakfast: ["morning"],
  coffee: ["morning", "daytime"],
  lunch: ["daytime"],
  workStudy: ["morning", "daytime"],
  dinner: ["evening"],
  drinks: ["evening", "lateNight"],
  nightlife: ["lateNight"],
};

const CONTEXT_TYPE_ID: Record<ContextId, string> = {
  breakfast: "breakfast",
  coffee: "coffee",
  lunch: "lunch",
  workStudy: "work_study",
  dinner: "dinner",
  drinks: "drinks",
  nightlife: "nightlife",
};

function venueInContext(venue: Venue, context: ContextId): boolean {
  // Explicit Places section assignments from Admin are the source of truth:
  // a venue appears under exactly the sections it was assigned to.
  if (venue.places_types && venue.places_types.length > 0) {
    return venue.places_types.includes(CONTEXT_TYPE_ID[context]);
  }
  // Legacy fallback (venues without places_types yet): day_parts, then
  // category-based inference — unchanged behaviour for unassigned venues.
  if (venue.day_parts && venue.day_parts.length > 0) {
    return DAY_PART_FOR_CONTEXT[context].some((part) =>
      venue.day_parts!.includes(part === "lateNight" ? "late_night" : part),
    );
  }
  const cats = CONTEXT_CATEGORIES[context];
  if (!cats.includes(venue.category)) return false;
  // Double-check the category's time window overlaps the context's window.
  return CONTEXT_DAY_PARTS[context].some((part) => categoryMatchesDayPart(venue.category, part));
}

const CONTEXT_ICONS: Record<ContextId, typeof Coffee> = {
  breakfast: Sunrise,
  coffee: Coffee,
  lunch: UtensilsCrossed,
  workStudy: Laptop,
  dinner: Moon,
  drinks: Martini,
  nightlife: Music,
};

const CONTEXT_ORDER: ContextId[] = ["breakfast", "coffee", "lunch", "workStudy", "dinner", "drinks", "nightlife"];

function categoryLabel(category: Venue["category"]): string {
  return category === "club" ? "Club" : VENUE_CATEGORIES.find((item) => item.id === category)?.label ?? "Other";
}

const priceLabel = (price: Venue["price_level"], dict: Record<string, string>): string =>
  dict[`price${price}`] ?? "€";

function sectionLabel(context: ContextId, dict: Record<string, string>): string {
  const key = `section${context.charAt(0).toUpperCase()}${context.slice(1)}` as const;
  return dict[key] ?? context;
}

interface PlacesDirectoryProps {
  venues: Venue[];
  /** First upcoming event per venue — surfaces "Tonight" lines on cards. */
  tonightByVenue: Record<string, Event | null>;
  savedVenueIds: string[];
}

export function PlacesDirectory({ venues, tonightByVenue, savedVenueIds }: PlacesDirectoryProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [context, setContext] = useState<ContextId | null>(null);
  const [category, setCategory] = useState<VenueCategory | null>(null);
  const [price, setPrice] = useState<0 | 1 | 2 | 3 | 4>(0);

  const contexts: { id: ContextId; label: string; sub: string; icon: typeof Coffee }[] = [
    { id: "breakfast", label: t.places.breakfast, sub: t.places.breakfastSub, icon: Sunrise },
    { id: "coffee", label: t.places.coffee, sub: t.places.coffeeSub, icon: Coffee },
    { id: "lunch", label: t.places.lunch, sub: t.places.lunchSub, icon: UtensilsCrossed },
    { id: "workStudy", label: t.places.workStudy, sub: t.places.workStudySub, icon: Laptop },
    { id: "dinner", label: t.places.dinner, sub: t.places.dinnerSub, icon: Moon },
    { id: "drinks", label: t.places.drinks, sub: t.places.drinksSub, icon: Martini },
    { id: "nightlife", label: t.places.nightlife, sub: t.places.nightlifeSub, icon: Music },
  ];

  const availableCategories = useMemo(() => {
    const present = new Set(venues.map((v) => v.category));
    return VENUE_CATEGORIES.filter((c) => present.has(c.id));
  }, [venues]);

  function placeMatchesQuery(place: Venue, q: string) {
    const normalized = q.trim().toLowerCase();
    if (!normalized) return true;
    return [place.name, place.address, place.category, place.city_slug, ...(place.music_genres ?? [])]
      .filter((value): value is string => Boolean(value))
      .some((value) => value.toLowerCase().includes(normalized));
  }

  const baseFiltered = useMemo(
    () =>
      venues.filter(
        (place) =>
          placeMatchesQuery(place, query) &&
          (!category || place.category === category) &&
          (!price || place.price_level === price),
      ),
    [venues, query, category, price],
  );

  const filtered = useMemo(
    () => (context ? baseFiltered.filter((place) => venueInContext(place, context)) : baseFiltered),
    [baseFiltered, context],
  );

  const sections = useMemo(() => {
    if (context || category || price || query.trim()) return null;
    return CONTEXT_ORDER.map((id) => ({
      id,
      items: venues.filter((place) => placeMatchesQuery(place, "") && venueInContext(place, id)),
    })).filter((section) => section.items.length > 0);
  }, [venues, context, category, price, query]);

  const hasFilters = Boolean(query.trim() || context || category || price);
  const showAsSections = !sections ? false : true;

  const clearFilters = () => {
    setQuery("");
    setContext(null);
    setCategory(null);
    setPrice(0);
  };

  return (
    <div className="mt-8">
      {/* Search */}
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-white/35" />
        <span className="sr-only">{t.places.searchLabel}</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.places.searchPlaces}
          className="h-10 w-full rounded-xl border border-white/10 bg-black/40 pl-9 pr-3 text-sm text-white placeholder:text-white/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        />
      </label>

      {/* Context chips */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        <button
          type="button"
          onClick={() => setContext(null)}
          aria-pressed={!context}
          className={cn(
            "flex flex-col items-start gap-1 rounded-2xl border px-3 py-2.5 text-left transition",
            !context
              ? "border-fuchsia-400/60 bg-fuchsia-500/15"
              : "border-white/10 bg-white/[0.03] hover:border-white/25",
          )}
        >
          <span className={cn("text-sm font-semibold", !context ? "text-fuchsia-100" : "text-white")}>
            {t.places.all}
          </span>
          <span className="text-xs text-white/50">{t.places.allSub}</span>
        </button>
        {contexts.map((ctx) => {
          const Icon = ctx.icon;
          const active = context === ctx.id;
          return (
            <button
              key={ctx.id}
              type="button"
              onClick={() => setContext(active ? null : ctx.id)}
              aria-pressed={active}
              className={cn(
                "flex flex-col items-start gap-1 rounded-2xl border px-3 py-2.5 text-left transition",
                active
                  ? "border-sky-400/60 bg-sky-500/15"
                  : "border-white/10 bg-white/[0.03] hover:border-white/25",
              )}
            >
              <span className={cn("inline-flex items-center gap-1.5 text-sm font-semibold", active ? "text-sky-100" : "text-white")}>
                <Icon className="h-3.5 w-3.5" />
                {ctx.label}
              </span>
              <span className="text-xs text-white/50">{ctx.sub}</span>
            </button>
          );
        })}
      </div>

      {/* Category + price filters */}
      {availableCategories.length ? (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-white/35">{t.places.filterCategory}</span>
          <button
            type="button"
            onClick={() => setCategory(null)}
            aria-pressed={!category}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition",
              !category ? "border-fuchsia-400/60 bg-fuchsia-500/15 text-fuchsia-100" : "border-white/15 text-white/60 hover:border-white/30 hover:text-white",
            )}
          >
            {t.places.all}
          </button>
          {availableCategories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(category === c.id ? null : c.id)}
              aria-pressed={category === c.id}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition",
                category === c.id ? "border-sky-400/60 bg-sky-500/15 text-sky-100" : "border-white/15 text-white/60 hover:border-white/30 hover:text-white",
              )}
            >
              {categoryLabel(c.id)}
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-white/35">{t.places.filterPrice}</span>
        <button
          type="button"
          onClick={() => setPrice(0)}
          aria-pressed={!price}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition",
            !price ? "border-fuchsia-400/60 bg-fuchsia-500/15 text-fuchsia-100" : "border-white/15 text-white/60 hover:border-white/30 hover:text-white",
          )}
        >
          {t.places.anyPrice}
        </button>
        {([1, 2, 3, 4] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPrice(price === p ? 0 : p)}
            aria-pressed={price === p}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition",
              price === p ? "border-sky-400/60 bg-sky-500/15 text-sky-100" : "border-white/15 text-white/60 hover:border-white/30 hover:text-white",
            )}
          >
            {priceLabel(p, t.places)}
          </button>
        ))}
      </div>

      {/* Results meta */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-white/45">
          {filtered.length} {filtered.length === 1 ? t.places.resultSingular : t.places.results}
          {context ? ` · ${sectionLabel(context, t.places)}` : ""}
          {category ? ` · ${categoryLabel(category)}` : ""}
          {price ? ` · ${priceLabel(price, t.places)}` : ""}
        </p>
        <div className="flex items-center gap-3">
          {hasFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 rounded-full border border-white/15 px-2.5 py-1 text-xs font-semibold text-white/70 transition hover:border-white/30 hover:text-white"
            >
              <X className="h-3 w-3" />
              {t.places.clearFilters}
            </button>
          ) : null}
          <a href="/map" className="inline-flex items-center gap-1 text-xs font-semibold text-sky-300 hover:text-sky-200">
            {t.places.exploreMap}
          </a>
        </div>
      </div>

      {/* Grouped sections (contexts) when no filter */}
      {showAsSections && sections ? (
        <div className="mt-6 space-y-10">
          {sections.map((section) => {
            const Icon = CONTEXT_ICONS[section.id];
            return (
              <section key={section.id} aria-labelledby={`places-section-${section.id}`}>
                <div className="mb-4 flex items-center gap-2">
                  <Icon className="h-4 w-4 text-sky-300/80" />
                  <h2 id={`places-section-${section.id}`} className="font-[family-name:var(--font-display)] text-lg font-bold text-white">
                    {sectionLabel(section.id, t.places)}
                  </h2>
                  <span className="text-xs text-white/40">
            {section.items.length} {section.items.length === 1 ? t.places.resultSingular : t.places.results}
          </span>
                </div>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {section.items.map((place) => (
                    <VenueCard
                      key={place.id}
                      venue={place}
                      tonight={tonightByVenue[place.id] ?? null}
                      saved={savedVenueIds.includes(place.id)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : filtered.length ? (
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((place) => (
            <VenueCard
              key={place.id}
              venue={place}
              tonight={tonightByVenue[place.id] ?? null}
              saved={savedVenueIds.includes(place.id)}
            />
          ))}
        </div>
      ) : (
        <div className="mt-8">
          <EmptyState
            title={t.places.noMatchTitle}
            description={t.places.noMatchDesc}
            icon={<Search className="h-10 w-10" />}
          />
        </div>
      )}
    </div>
  );
}