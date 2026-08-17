import type { SupabaseClient } from "@supabase/supabase-js";
import { mapEventRow } from "@/lib/mappers/supabase";
import { getPublicSupabase } from "@/lib/supabase/public-server";
import { getTodayRangeInTz } from "@/lib/event-dates";
import type { Event } from "@/types";

const eventSelect = `
        id,
        slug,
        title,
        description,
        starts_at,
        ends_at,
        genre,
        image_url,
        dj_lineup,
        performers,
        capacity,
        ticket_url,
        crowd_count,
        atmosphere_rating,
        live_status,
        fomo_line,
        reservation_spots_left,
        ticket_from_eur,
        is_hidden_premium,
        is_listed_public,
        is_featured,
        city_slug,
        category,
        tags,
        is_free,
        venues (
          id,
          slug,
          name,
          image_url,
          price_level,
          category,
          address,
          city_slug,
          lat,
          lng,
          is_trending,
          approved
        )
      `;

function clientOrPublic(client?: SupabaseClient | null): SupabaseClient | null {
  return client ?? getPublicSupabase();
}

export async function getFeaturedEvents(client?: SupabaseClient | null): Promise<Event[]> {
  try {
    const supabase = clientOrPublic(client);
    if (!supabase) return [];

    // Include events that are currently happening (started up to 8 hours ago) or in the future
    const cutoff = new Date(Date.now() - 8 * 3600000).toISOString();

    const { data, error } = await supabase
      .from("events")
      .select(eventSelect)
      .eq("is_listed_public", true)
      .gte("starts_at", cutoff)
      .order("is_featured", { ascending: false })
      .order("starts_at", { ascending: true })
      .limit(80);

    if (error) {
      console.error("[neya] getFeaturedEvents", error.message);
      return [];
    }

    return (
      data
        ?.map((row) => mapEventRow(row as Parameters<typeof mapEventRow>[0]))
        .filter((e): e is Event => e !== null) ?? []
    );
  } catch (e) {
    console.error("[neya] getFeaturedEvents", e);
    return [];
  }
}

export async function getEventBySlug(slug: string, client?: SupabaseClient | null): Promise<Event | null> {
  try {
    const supabase = clientOrPublic(client);
    if (!supabase) return null;

    const { data, error } = await supabase.from("events").select(eventSelect).eq("slug", slug).maybeSingle();

    if (error) {
      console.error("[neya] getEventBySlug", error.message);
      return null;
    }
    if (!data) return null;
    return mapEventRow(data as Parameters<typeof mapEventRow>[0]);
  } catch (e) {
    console.error("[neya] getEventBySlug", e);
    return null;
  }
}

export type DiscoveryQuery = {
  city?: string;
  from?: string;
  to?: string;
  category?: string;
  genre?: string;
  venue?: string;
  free?: boolean;
  ticketed?: boolean;
  reservations?: boolean;
};

/** Public discovery query over the same event records used by checkout and QR. */
export async function getDiscoveryEvents(query: DiscoveryQuery = {}, client?: SupabaseClient | null): Promise<Event[]> {
  try {
    const supabase = clientOrPublic(client);
    if (!supabase) return [];
    let request = supabase.from("events").select(eventSelect).eq("is_listed_public", true).eq("submission_status", "approved");
    if (query.city) request = request.eq("city_slug", query.city);
    if (query.from) request = request.gte("starts_at", query.from);
    if (query.to) request = request.lt("starts_at", query.to);
    if (query.category) request = request.eq("category", query.category);
    if (query.genre) request = request.eq("genre", query.genre);
    if (query.venue) request = request.eq("venue_id", query.venue);
    if (query.free) request = request.eq("is_free", true);
    if (query.ticketed) request = request.eq("is_free", false);
    if (query.reservations) request = request.eq("reservations_enabled", true);
    const { data, error } = await request.gte("starts_at", new Date().toISOString()).order("is_featured", { ascending: false }).order("starts_at", { ascending: true }).limit(250);
    if (error) { console.error("[neya] getDiscoveryEvents", error.message); return []; }
    return data?.map((row) => mapEventRow(row as Parameters<typeof mapEventRow>[0])).filter((event): event is Event => event !== null) ?? [];
  } catch (error) { console.error("[neya] getDiscoveryEvents", error); return []; }
}

/** Public events that start during the current calendar day in Prishtina. */
export async function getTonightEvents(client?: SupabaseClient | null): Promise<Event[]> {
  try {
    const supabase = clientOrPublic(client);
    if (!supabase) return [];
    const { start, end } = getTodayRangeInTz();
    const { data, error } = await supabase
      .from("events")
      .select(eventSelect)
      .eq("is_listed_public", true)
      .gte("starts_at", start)
      .lt("starts_at", end)
      .order("starts_at", { ascending: true })
      .limit(80);
    if (error) {
      console.error("[neya] getTonightEvents", error.message);
      return [];
    }
    return data?.map((row) => mapEventRow(row as Parameters<typeof mapEventRow>[0])).filter((e): e is Event => e !== null) ?? [];
  } catch (e) {
    console.error("[neya] getTonightEvents", e);
    return [];
  }
}

export async function getUpcomingEventsForVenue(
  venueId: string,
  client?: SupabaseClient | null,
): Promise<Event[]> {
  try {
    const supabase = clientOrPublic(client);
    if (!supabase) return [];

    const { data, error } = await supabase
      .from("events")
      .select(eventSelect)
      .eq("venue_id", venueId)
      .eq("is_listed_public", true)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(24);
    if (error) {
      console.error("[neya] getUpcomingEventsForVenue", error.message);
      return [];
    }
    return data?.map((row) => mapEventRow(row as Parameters<typeof mapEventRow>[0])).filter((e): e is Event => e !== null) ?? [];
  } catch (e) {
    console.error("[neya] getUpcomingEventsForVenue", e);
    return [];
  }
}
