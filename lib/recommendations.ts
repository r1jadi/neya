import type { Event, Venue } from "@/types";

export const VIBES = ["chill", "party", "live music", "date", "techno", "rooftop"] as const;
export type RecommendationVibe = (typeof VIBES)[number];

export const BUDGETS = ["under €20", "€20–50", "€50+"] as const;
export type RecommendationBudget = (typeof BUDGETS)[number];

export type RecommendationPreferences = {
  vibe?: RecommendationVibe;
  budget?: RecommendationBudget;
  maxDistanceKm?: number;
  categories?: string[];
  from?: string;
  to?: string;
  area?: string;
  limit?: number;
  currentTime?: string;
};

export type RecommendationItem = {
  kind: "event" | "venue";
  id: string;
  slug: string;
  title: string;
  image: string;
  startsAt?: string;
  venueName?: string;
  score: number;
  reasons: string[];
};

export function budgetRange(budget?: RecommendationBudget): [number, number] | null {
  if (budget === "under €20") return [0, 20];
  if (budget === "€20–50") return [20, 50];
  if (budget === "€50+") return [50, Number.POSITIVE_INFINITY];
  return null;
}

function textMatches(value: string | null | undefined, needle: string): boolean {
  return value?.toLowerCase().includes(needle.toLowerCase()) ?? false;
}

function vibeMatches(event: Event, vibe: RecommendationVibe): boolean {
  const haystack = [event.title, event.description, event.genre, event.category, event.venue?.name, event.venue?.category, ...(event.tags ?? [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const terms: Record<RecommendationVibe, string[]> = {
    chill: ["chill", "lounge", "ambient", "acoustic", "jazz", "cafe"],
    party: ["party", "nightlife", "dj", "club", "festival", "dance"],
    "live music": ["live", "concert", "music", "band", "singer"],
    date: ["date", "romantic", "dinner", "cocktail", "lounge", "jazz"],
    techno: ["techno", "house", "electro", "warehouse", "underground"],
    rooftop: ["rooftop", "roof", "terrace"],
  };
  return terms[vibe].some((term) => haystack.includes(term));
}

function eventPrice(event: Event): number | null {
  if (event.is_free) return 0;
  return typeof event.ticket_from_eur === "number" && Number.isFinite(event.ticket_from_eur)
    ? event.ticket_from_eur
    : null;
}

function matchesBudget(event: Event, budget?: RecommendationBudget): boolean {
  const range = budgetRange(budget);
  if (!range) return true;
  const price = eventPrice(event);
  if (price == null) return false;
  return price >= range[0] && price < range[1];
}

function matchesTime(event: Event, from?: string, to?: string): boolean {
  const starts = new Date(event.starts_at).getTime();
  if (from && starts < new Date(from).getTime()) return false;
  if (to && starts >= new Date(to).getTime()) return false;
  return true;
}

function withinDistance(distance: number | undefined, maxDistanceKm: number | undefined): boolean {
  return maxDistanceKm == null || (distance != null && distance <= maxDistanceKm);
}

function categoryMatches(event: Event, categories: string[] | undefined): boolean {
  if (!categories?.length) return true;
  const values = [event.category, event.genre, event.venue?.category, ...(event.tags ?? [])].filter(Boolean).map((v) => v!.toLowerCase());
  return categories.some((category) => values.includes(category.toLowerCase()));
}

function scoreEvent(event: Event, preferences: RecommendationPreferences): number {
  let score = 0;
  if (preferences.vibe && vibeMatches(event, preferences.vibe)) score += 40;
  if (preferences.budget && matchesBudget(event, preferences.budget)) score += 25;
  if (preferences.categories?.length && categoryMatches(event, preferences.categories)) score += 25;
  if (event.is_featured) score += 8;
  if (event.live_status) score += 6;
  score += Math.max(0, 10 - (event.distance_km ?? 10));
  return score;
}

function reasonsForEvent(event: Event, preferences: RecommendationPreferences): string[] {
  const reasons: string[] = [];
  if (preferences.vibe && vibeMatches(event, preferences.vibe)) reasons.push(`Matches your ${preferences.vibe} vibe`);
  if (preferences.budget && matchesBudget(event, preferences.budget)) reasons.push(`Fits your ${preferences.budget} budget`);
  if (preferences.categories?.length && categoryMatches(event, preferences.categories)) reasons.push("Matches your preferred category");
  if (event.live_status) reasons.push("Live right now");
  if (!reasons.length) reasons.push("Available tonight near you");
  return reasons.slice(0, 3);
}

export function rankTonightRecommendations(events: Event[], venues: Venue[], preferences: RecommendationPreferences): RecommendationItem[] {
  const now = preferences.currentTime ? new Date(preferences.currentTime).getTime() : Date.now();
  const eventItems = events
    .filter((event) => { const start = new Date(event.starts_at).getTime(); const end = event.ends_at ? new Date(event.ends_at).getTime() : start + 8 * 3600000; return Number.isFinite(start) && end >= now; })
    .filter((event) => matchesBudget(event, preferences.budget))
    .filter((event) => categoryMatches(event, preferences.categories))
    .filter((event) => preferences.vibe == null || vibeMatches(event, preferences.vibe))
    .filter((event) => matchesTime(event, preferences.from, preferences.to))
    .filter((event) => !preferences.area || textMatches(event.city_slug, preferences.area) || textMatches(event.venue?.city_slug, preferences.area) || textMatches(event.venue?.address, preferences.area))
    .filter((event) => withinDistance(event.distance_km, preferences.maxDistanceKm))
    .map((event) => ({
      kind: "event" as const,
      id: event.id,
      slug: event.slug,
      title: event.title,
      image: event.image_url,
      startsAt: event.starts_at,
      venueName: event.venue?.name ?? event.venue_name ?? undefined,
      score: scoreEvent(event, preferences),
      reasons: reasonsForEvent(event, preferences),
    }));

  const range = budgetRange(preferences.budget);
  const venueItems = venues
    .filter((venue) => !preferences.area || textMatches(venue.city_slug, preferences.area) || textMatches(venue.address, preferences.area))
    .filter((venue) => !preferences.categories?.length || preferences.categories.some((category) => venue.category.toLowerCase() === category.toLowerCase() || venue.places_types?.some((type) => type.toLowerCase() === category.toLowerCase())))
    .filter((venue) => withinDistance(venue.distance_km, preferences.maxDistanceKm))
    .filter((venue) => !preferences.vibe || vibeMatches({ ...venue, title: venue.name, description: venue.description, genre: "other", image_url: venue.image_url, starts_at: "", slug: venue.slug, id: venue.id, venue, crowd_count: 0, atmosphere_rating: venue.atmosphere_score ?? 0, live_status: venue.is_live ?? false, price_level: venue.price_level } as Event, preferences.vibe))
    .filter((venue) => !range || (venue.price_level <= 2 && range[0] < 20) || (venue.price_level === 3 && range[0] <= 50) || (venue.price_level === 4 && range[0] >= 50))
    .map((venue) => ({
      kind: "venue" as const,
      id: venue.id,
      slug: venue.slug,
      title: venue.name,
      image: venue.image_url,
      score: (preferences.vibe && vibeMatches({ ...venue, title: venue.name, description: venue.description, genre: "other", image_url: venue.image_url, starts_at: "", slug: venue.slug, id: venue.id, venue: venue, crowd_count: 0, atmosphere_rating: venue.atmosphere_score ?? 0, live_status: venue.is_live ?? false, price_level: venue.price_level } as Event, preferences.vibe) ? 30 : 0) + (venue.is_trending ? 12 : 0) + (venue.is_featured ? 8 : 0) + Math.max(0, 10 - (venue.distance_km ?? 10)),
      reasons: [preferences.vibe ? `A good fit for a ${preferences.vibe} night` : "Open tonight in NEYA", venue.is_trending ? "Trending nearby" : "A nearby place to start"],
    }));

  return [...eventItems, ...venueItems].sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)).slice(0, Math.min(Math.max(preferences.limit ?? 20, 1), 50));
}
