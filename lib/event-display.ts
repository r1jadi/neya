import { CITY_TZ, formatEventWhen, isHappeningNow } from "@/lib/event-dates";
import type { Event, MusicGenre } from "@/types";

const GENRE_LABELS: Partial<Record<MusicGenre, string>> = {
  house: "House",
  techno: "Techno",
  afro: "Afro",
  "hip hop": "Hip Hop",
  "r&b": "R&B",
  latin: "Latin",
  "live music": "Live",
  mixed: "Mixed",
};

export function formatGenreLabel(genre: MusicGenre): string {
  return GENRE_LABELS[genre] ?? genre;
}

export function formatEventTimeRange(startsAt: string, endsAt?: string | null): string {
  const start = new Date(startsAt);
  const startDate = start.toLocaleDateString("en-GB", {
    timeZone: CITY_TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const startTime = start.toLocaleTimeString("en-GB", {
    timeZone: CITY_TZ,
    hour: "2-digit",
    minute: "2-digit",
  });

  if (!endsAt) {
    return `${startDate} · ${startTime} · until late`;
  }

  const end = new Date(endsAt);
  const endTime = end.toLocaleTimeString("en-GB", {
    timeZone: CITY_TZ,
    hour: "2-digit",
    minute: "2-digit",
  });
  const sameDay = start.toLocaleDateString("en-CA", { timeZone: CITY_TZ }) === end.toLocaleDateString("en-CA", { timeZone: CITY_TZ });

  if (sameDay) {
    return `${startDate} · ${startTime} – ${endTime}`;
  }

  const endDate = end.toLocaleDateString("en-GB", {
    timeZone: CITY_TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  return `${startDate} · ${startTime} → ${endDate} · ${endTime}`;
}

export function formatCapacity(capacity?: number | null): string | null {
  if (capacity == null || capacity <= 0) return null;
  return capacity.toLocaleString();
}

export function formatTicketPrice(event: Event): string | null {
  if (event.ticket_from_eur != null && event.ticket_from_eur > 0) {
    return `From €${event.ticket_from_eur}`;
  }
  if (event.ticket_url) return "Tickets available";
  return null;
}

export function getEventDescription(event: Event): string | null {
  const text = event.description?.trim();
  return text || null;
}

export function getEventWhenLabel(event: Event): string {
  return formatEventWhen(event.starts_at);
}

export function isEventLiveNow(event: Event): boolean {
  return isHappeningNow(event.starts_at, event.ends_at) && event.live_status;
}

export function getVenueLocationLabel(event: Event): string | null {
  if (!event.venue) return null;
  if (event.venue.address) return event.venue.address;
  const city = event.venue.city_slug === "prishtina" ? "Prishtina" : event.venue.city_slug;
  return city ? `${event.venue.name}, ${city}` : event.venue.name;
}

export function eventHasPoster(event: Event): boolean {
  return Boolean(event.image_url && !event.image_url.endsWith("/placeholder.svg"));
}
