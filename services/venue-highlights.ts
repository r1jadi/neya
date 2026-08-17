import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { todayYmdInTz } from "@/lib/event-dates";
import type { VenueHighlight } from "@/types";

type HighlightRow = {
  id: string;
  venue_id: string;
  event_id?: string | null;
  title: string;
  content: string;
  image_url?: string | null;
  week_start: string;
  week_end: string;
  is_active: boolean;
  created_at: string;
  venues?:
    | { id: string; slug: string; name: string; image_url?: string | null; category?: string | null; is_featured?: boolean }
    | { id: string; slug: string; name: string; image_url?: string | null; category?: string | null; is_featured?: boolean }[]
    | null;
  events?:
    | { id: string; slug: string; title: string; starts_at?: string | null }
    | { id: string; slug: string; title: string; starts_at?: string | null }[]
    | null;
};

/** PostgREST embedded relations can come back as an object (to-one) or array (to-many). */
function oneOrArray<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function mapHighlightRow(row: HighlightRow): VenueHighlight {
  const venue = oneOrArray(row.venues);
  const event = oneOrArray(row.events);
  return {
    id: row.id,
    venue_id: row.venue_id,
    event_id: row.event_id ?? null,
    title: row.title,
    content: row.content,
    image_url: row.image_url || null,
    week_start: row.week_start,
    week_end: row.week_end,
    is_active: Boolean(row.is_active),
    created_at: row.created_at,
    venue: venue
      ? {
          id: venue.id,
          slug: venue.slug,
          name: venue.name,
          image_url: venue.image_url || null,
          category: venue.category || null,
          is_featured: Boolean(venue.is_featured),
        }
      : null,
    event: event
      ? {
          id: event.id,
          slug: event.slug,
          title: event.title,
          starts_at: event.starts_at ?? null,
        }
      : null,
  };
}

const HIGHLIGHT_SELECT =
  "id, venue_id, event_id, title, content, image_url, week_start, week_end, is_active, created_at, venues!inner(id, slug, name, image_url, category, is_featured), events(id, slug, title, starts_at)";

/**
 * Active highlights for the homepage. Deduplicated by venue (one per venue),
 * ordered: featured venues first, then earliest week, then most recently
 * published. Returns at most `limit` cards.
 */
export async function getActiveHighlightsForHome(limit = 6): Promise<VenueHighlight[]> {
  const supabase = await createClient();
  const today = todayYmdInTz();
  const { data } = await supabase
    .from("venue_weekly_highlights")
    .select(HIGHLIGHT_SELECT)
    .eq("is_active", true)
    .lte("week_start", today)
    .gte("week_end", today)
    .eq("venues.approved", true)
    .order("created_at", { ascending: false })
    .limit(60);

  const rows = (data ?? []) as HighlightRow[];
  // One highlight per venue — keep the most recently published for each.
  const byVenue = new Map<string, HighlightRow>();
  for (const row of rows) {
    if (!byVenue.has(row.venue_id)) byVenue.set(row.venue_id, row);
  }
  return [...byVenue.values()]
    .map(mapHighlightRow)
    .sort((a, b) => {
      const aFeatured = Boolean(a.venue?.is_featured) ? 1 : 0;
      const bFeatured = Boolean(b.venue?.is_featured) ? 1 : 0;
      if (aFeatured !== bFeatured) return bFeatured - aFeatured;
      if (a.week_start !== b.week_start) return a.week_start < b.week_start ? -1 : 1;
      return a.created_at < b.created_at ? 1 : -1;
    })
    .slice(0, limit);
}

/** The single active highlight for a venue page, or null. */
export async function getActiveHighlightForVenue(venueId: string): Promise<VenueHighlight | null> {
  if (!venueId) return null;
  const supabase = await createClient();
  const today = todayYmdInTz();
  const { data } = await supabase
    .from("venue_weekly_highlights")
    .select(HIGHLIGHT_SELECT)
    .eq("venue_id", venueId)
    .eq("is_active", true)
    .lte("week_start", today)
    .gte("week_end", today)
    .maybeSingle();
  if (!data) return null;
  return mapHighlightRow(data as HighlightRow);
}

/** All highlights (incl. past/inactive) for the admin panel, newest week first. */
export async function getAdminHighlights(): Promise<VenueHighlight[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("venue_weekly_highlights")
    .select(HIGHLIGHT_SELECT)
    .order("week_start", { ascending: false })
    .limit(200);
  return ((data ?? []) as HighlightRow[]).map(mapHighlightRow);
}
