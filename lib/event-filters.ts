import type { Event, MusicGenre, VenueCategory } from "@/types";

const DJ_GENRES: MusicGenre[] = ["house", "techno", "afro"];

/** Next few nights — pragmatic “this weekend” window for the feed */
export function thisWeekend(events: Event[]) {
  const now = Date.now();
  const horizon = now + 5 * 86400000;
  return events.filter((e) => {
    const t = new Date(e.starts_at).getTime();
    return t >= now && t <= horizon;
  });
}

export function sortByCrowd(events: Event[]) {
  return [...events].sort((a, b) => b.crowd_count - a.crowd_count);
}

export function sortByAtmosphere(events: Event[]) {
  return [...events].sort((a, b) => b.atmosphere_rating - a.atmosphere_rating);
}

export function liveNow(events: Event[]) {
  return events.filter((e) => e.live_status);
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
