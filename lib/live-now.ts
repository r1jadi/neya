import { isHappeningNow } from "@/lib/event-dates";
import type { Event, Venue } from "@/types";

export const LIVE_NOW_FILTERS = ["all", "nearby", "music", "party", "food", "drinks"] as const;
export type LiveNowFilter = (typeof LIVE_NOW_FILTERS)[number];
export type LiveNowItem = {
  kind: "event" | "venue";
  id: string;
  slug: string;
  title: string;
  image: string;
  status: "live" | "starting_soon" | "open";
  startsAt?: string;
  endsAt?: string;
  location?: string;
  distanceKm?: number;
  crowdCount?: number;
  category?: string;
  reason: string;
};

function text(item: Event | Venue): string {
  const tags = "tags" in item ? item.tags ?? [] : [];
  const genres = "music_genres" in item ? item.music_genres ?? [] : [];
  return ["title" in item ? item.title : item.name, item.category, "genre" in item ? item.genre : undefined, ...tags, ...genres].filter(Boolean).join(" ").toLowerCase();
}

function matchesFilter(item: Event | Venue, filter: LiveNowFilter): boolean {
  if (filter === "all") return true;
  if (filter === "nearby") return item.distance_km != null;
  const value = text(item);
  if (filter === "music") return /music|concert|dj|techno|house|jazz|band|live/.test(value);
  if (filter === "party") return /party|nightlife|club|festival|dance|dj/.test(value);
  if (filter === "food") return /food|dinner|restaurant|cafe|lunch/.test(value);
  return /drink|bar|cocktail|rooftop|lounge|pub/.test(value);
}

export function isVenueOpenNow(venue: Venue, now = new Date()): boolean {
  const parts = venue.day_parts ?? [];
  if (!parts.length) return Boolean(venue.is_live || venue.is_featured || venue.is_trending);
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Belgrade", hour: "numeric", hour12: false }).format(new Date(now)));
  const part = hour >= 5 && hour < 11 ? "morning" : hour >= 11 && hour < 16 ? "daytime" : hour >= 16 && hour < 22 ? "evening" : "late_night";
  return venue.is_live || parts.includes(part);
}

export function buildLiveNowItems(events: Event[], venues: Venue[], filter: LiveNowFilter = "all", now = new Date()): LiveNowItem[] {
  const current = now.getTime();
  const eventItems = events.filter((event) => {
    const start = new Date(event.starts_at).getTime();
    const end = event.ends_at ? new Date(event.ends_at).getTime() : start + 8 * 3600000;
    return Number.isFinite(start) && end >= current && (isHappeningNow(event.starts_at, event.ends_at, now) || start > current && start - current <= 2 * 3600000) && matchesFilter(event, filter);
  }).map((event) => ({
    kind: "event" as const, id: event.id, slug: event.slug, title: event.title, image: event.image_url,
    status: isHappeningNow(event.starts_at, event.ends_at, now) ? "live" as const : "starting_soon" as const,
    startsAt: event.starts_at, endsAt: event.ends_at, location: event.venue?.name ?? event.venue_name ?? event.city_slug,
    distanceKm: event.distance_km, crowdCount: event.crowd_count, category: event.category, reason: isHappeningNow(event.starts_at, event.ends_at, now) ? "Happening right now" : "Starting soon",
  }));
  const venueItems = venues.filter((venue) => isVenueOpenNow(venue, now) && matchesFilter(venue, filter)).map((venue) => ({
    kind: "venue" as const, id: venue.id, slug: venue.slug, title: venue.name, image: venue.image_url,
    status: "open" as const, location: venue.address ?? venue.city_slug, distanceKm: venue.distance_km, crowdCount: venue.crowd_count,
    category: venue.category, reason: venue.is_live ? "Live atmosphere now" : "Open now",
  }));
  return [...eventItems, ...venueItems].sort((a, b) => (a.status === "live" ? 0 : 1) - (b.status === "live" ? 0 : 1) || (a.distanceKm ?? 99) - (b.distanceKm ?? 99) || a.title.localeCompare(b.title));
}
