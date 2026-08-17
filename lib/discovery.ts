import type { Event } from "@/types";

export const EVENT_CATEGORIES = [
  { id: "nightlife", label: "Nightlife" }, { id: "dj_set", label: "DJ sets" },
  { id: "concert", label: "Concerts" }, { id: "festival", label: "Festivals" },
  { id: "live_music", label: "Live music" }, { id: "student", label: "Student events" },
  { id: "sports", label: "Sports" }, { id: "culture", label: "Culture" },
  { id: "art", label: "Art" }, { id: "theatre", label: "Theatre" },
  { id: "comedy", label: "Comedy" }, { id: "food_drink", label: "Food & drink" },
  { id: "wellness", label: "Wellness" }, { id: "workshop", label: "Workshops" },
  { id: "family", label: "Family" }, { id: "community", label: "Community" },
  { id: "outdoor", label: "Outdoor" }, { id: "other", label: "Other" },
] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number]["id"];
export const DISCOVERY_WINDOWS = ["tonight", "tomorrow", "this-week", "weekend", "next-week", "upcoming"] as const;
export type DiscoveryWindow = (typeof DISCOVERY_WINDOWS)[number];

export function categoryLabel(value: string | undefined) {
  return EVENT_CATEGORIES.find((item) => item.id === value)?.label ?? "Other";
}

export function eventMatchesQuery(event: Event, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return [event.title, event.description, event.venue?.name, event.venue?.address, event.genre, event.category, ...(event.tags ?? [])]
    .filter((value): value is string => Boolean(value))
    .some((value) => value.toLowerCase().includes(normalized));
}
