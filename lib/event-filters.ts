import { isHappeningNow, isOnThisWeekend, isPast, isTonight, isUpcoming } from "@/lib/event-dates";
import type { Event, MusicGenre, VenueCategory } from "@/types";

const DJ_GENRES: MusicGenre[] = ["house", "techno", "afro"];

/** Events starting later today (Prishtina TZ). */
export function tonightEvents(events: Event[], now = new Date()) {
  return events.filter((e) => isTonight(e.starts_at, now) && !isPast(e.starts_at, e.ends_at, now));
}

/** Events with start time in the future. */
export function upcomingEvents(events: Event[], now = new Date()) {
  return events
    .filter((e) => isUpcoming(e.starts_at, now) || isHappeningNow(e.starts_at, e.ends_at, now))
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
}

/** Currently in progress (by clock, not DB live flag). */
export function happeningNowEvents(events: Event[], now = new Date()) {
  return events.filter((e) => isHappeningNow(e.starts_at, e.ends_at, now));
}

/** Friday–Sunday in Prishtina (current weekend if already Fri–Sun, else the next). */
export function thisWeekend(events: Event[], now = new Date()) {
  return upcomingEvents(events, now).filter(
    (e) => isOnThisWeekend(e.starts_at, now) && !isPast(e.starts_at, e.ends_at, now),
  );
}

export function sortByCrowd(events: Event[]) {
  return [...events].sort((a, b) => b.crowd_count - a.crowd_count);
}

export function sortByAtmosphere(events: Event[]) {
  return [...events].sort((a, b) => b.atmosphere_rating - a.atmosphere_rating);
}

export function liveNow(events: Event[], now = new Date()) {
  return events.filter((e) => isHappeningNow(e.starts_at, e.ends_at, now) && e.live_status);
}

export function rooftopEvents(events: Event[]) {
  return events.filter((e) => e.venue.category === "rooftop");
}

export function djSets(events: Event[]) {
  return events.filter((e) => DJ_GENRES.includes(e.genre));
}

export function studentParties(events: Event[]) {
  return events.filter(
    (e) => /\bstudent\b/i.test(e.title) || /\buni\b/i.test(e.title) || /\buniversity\b/i.test(e.title),
  );
}

export function hiddenGems(events: Event[]) {
  return [...events]
    .filter((e) => e.crowd_count < 180 && e.atmosphere_rating >= 8.4)
    .sort((a, b) => b.atmosphere_rating - a.atmosphere_rating);
}

export function lastTablesLeft(events: Event[]) {
  return events.filter((e) => e.reservation_spots_left != null && e.reservation_spots_left <= 4);
}

export function nearbyFirst(events: Event[]) {
  return [...events].sort((a, b) => {
    const da = a.distance_km ?? 99;
    const db = b.distance_km ?? 99;
    return da - db;
  });
}

export function matchGenres(events: Event[], genres: string[]) {
  if (!genres.length) return [];
  const set = new Set(genres.map((g) => g.toLowerCase()));
  return [...events]
    .filter((e) => set.has(e.genre))
    .sort((a, b) => b.atmosphere_rating - a.atmosphere_rating);
}

export function uniqueBySlug(list: Event[]) {
  const seen = new Set<string>();
  return list.filter((e) => {
    if (seen.has(e.slug)) return false;
    seen.add(e.slug);
    return true;
  });
}
