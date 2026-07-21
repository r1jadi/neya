import type { SupabaseClient } from "@supabase/supabase-js";
import { getPublicSupabase } from "@/lib/supabase/public-server";
import {
  mapGuideDayRow,
  mapGuideRow,
  mapGuideStopRow,
  mapGuideTransportRow,
  mapIntercityRouteRow,
} from "@/lib/mappers/guides";
import type { Event } from "@/types";
import type { Guide, GuideDay, GuidePurchase, IntercityBusRoute, ItineraryPreferences } from "@/types/guides";
import { mapEventRow } from "@/lib/mappers/supabase";

function clientOrPublic(client?: SupabaseClient | null): SupabaseClient | null {
  return client ?? getPublicSupabase();
}

const guideListSelect = `
  id, slug, title, description, cover_image, duration_days, duration_label,
  location_type, location_name, price, currency, difficulty, featured, published,
  categories, best_season, daily_budget_eur, total_budget_eur, avg_visit_duration_minutes,
  family_friendly, created_at, updated_at
`;

export async function getPublishedGuides(client?: SupabaseClient | null): Promise<Guide[]> {
  try {
    const supabase = clientOrPublic(client);
    if (!supabase) return [];

    const { data, error } = await supabase
      .from("guides")
      .select(guideListSelect)
      .eq("published", true)
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => mapGuideRow(row));
  } catch (err) {
    console.error("[neya] getPublishedGuides:", err);
    return [];
  }
}

export async function getGuideBySlug(
  slug: string,
  client?: SupabaseClient | null,
  options?: { includeUnpublished?: boolean },
): Promise<Guide | null> {
  try {
    const supabase = clientOrPublic(client);
    if (!supabase) return null;

    let query = supabase.from("guides").select(guideListSelect).eq("slug", slug);
    if (!options?.includeUnpublished) {
      query = query.eq("published", true);
    }
    const { data: guideRow, error } = await query.maybeSingle();
    if (error || !guideRow) return null;

    const days = await loadGuideDays(supabase, guideRow.id);
    const allStops = days.flatMap((d) => d.stops ?? []);
    return mapGuideRow(guideRow, {
      days,
      stop_count: allStops.length,
      preview_stops: allStops.slice(0, 6),
    });
  } catch (err) {
    console.error("[neya] getGuideBySlug:", err);
    return null;
  }
}

async function loadGuideDays(supabase: SupabaseClient, guideId: string): Promise<GuideDay[]> {
  const { data: dayRows } = await supabase
    .from("guide_days")
    .select("id, guide_id, day_number, title, description")
    .eq("guide_id", guideId)
    .order("day_number", { ascending: true });

  if (!dayRows?.length) return [];

  const dayIds = dayRows.map((d) => d.id);
  const { data: stopRows } = await supabase
    .from("guide_stops")
    .select("id, guide_day_id, name, description, latitude, longitude, category, image, estimated_visit_time, order_index")
    .in("guide_day_id", dayIds)
    .order("order_index", { ascending: true });

  const stopIds = (stopRows ?? []).map((s) => s.id);
  let transportRows: Parameters<typeof mapGuideTransportRow>[0][] = [];
  if (stopIds.length) {
    const { data: tr } = await supabase
      .from("guide_transports")
      .select("id, guide_stop_id, transport_type, station_name, station_latitude, station_longitude, departure_frequency, notes, route_name, route_origin, route_destination, intercity_route_id")
      .in("guide_stop_id", stopIds);
    transportRows = tr ?? [];
  }

  return dayRows.map((day) => {
    const stops = (stopRows ?? [])
      .filter((s) => s.guide_day_id === day.id)
      .map((s) =>
        mapGuideStopRow(
          s,
          transportRows.filter((t) => t.guide_stop_id === s.id),
        ),
      );
    return mapGuideDayRow(day, stops);
  });
}

export async function getUserGuidePurchase(
  guideId: string,
  userId: string,
  client: SupabaseClient,
): Promise<GuidePurchase | null> {
  try {
    const { data } = await client
      .from("guide_purchases")
      .select("id, guide_id, user_id, purchase_date, access_until, status")
      .eq("guide_id", guideId)
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();
    if (!data) return null;
    if (data.access_until && new Date(data.access_until) < new Date()) return null;
    return data as GuidePurchase;
  } catch {
    return null;
  }
}

export async function userHasGuideAccess(
  guideId: string,
  userId: string | undefined,
  client: SupabaseClient,
): Promise<boolean> {
  if (!userId) return false;
  const purchase = await getUserGuidePurchase(guideId, userId, client);
  return purchase != null;
}

export async function getUserPurchasedGuides(userId: string, client: SupabaseClient): Promise<Guide[]> {
  try {
    const { data: purchases } = await client
      .from("guide_purchases")
      .select("guide_id")
      .eq("user_id", userId)
      .eq("status", "active");
    const ids = purchases?.map((p) => p.guide_id) ?? [];
    if (!ids.length) return [];

    const { data } = await client.from("guides").select(guideListSelect).in("id", ids);
    return (data ?? []).map((row) => mapGuideRow(row));
  } catch (err) {
    console.error("[neya] getUserPurchasedGuides:", err);
    return [];
  }
}

export async function getIntercityRoutes(client?: SupabaseClient | null): Promise<IntercityBusRoute[]> {
  try {
    const supabase = clientOrPublic(client);
    if (!supabase) return [];

    const { data } = await supabase
      .from("intercity_bus_routes")
      .select("id, origin, destination, route_name, station_name, station_latitude, station_longitude, departure_frequency, notes, active")
      .eq("active", true)
      .order("route_name");
    return (data ?? []).map(mapIntercityRouteRow);
  } catch {
    return [];
  }
}

/** Events within ~15km of a stop */
export async function getEventsNearStop(
  lat: number,
  lng: number,
  client?: SupabaseClient | null,
  limit = 5,
): Promise<Event[]> {
  try {
    const supabase = clientOrPublic(client);
    if (!supabase) return [];

    const { data } = await supabase
      .from("events")
      .select(
        `id, slug, title, description, starts_at, ends_at, genre, image_url, dj_lineup, capacity,
         crowd_count, atmosphere_rating, live_status, reservation_spots_left, ticket_from_eur,
         is_featured, is_listed_public, is_hidden_premium, fomo_line,
         venues!inner (id, slug, name, image_url, category, address, city_slug, lat, lng, approved, is_trending, price_level)`,
      )
      .eq("is_listed_public", true)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(50);

    const events = (data ?? [])
      .map((row) => mapEventRow(row))
      .filter((e): e is Event => e != null);

    return events
      .filter((e) => {
        const vLat = e.venue?.lat;
        const vLng = e.venue?.lng;
        if (vLat == null || vLng == null) return false;
        return haversineKm(lat, lng, vLat, vLng) <= 15;
      })
      .slice(0, limit);
  } catch (err) {
    console.error("[neya] getEventsNearStop:", err);
    return [];
  }
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Mock AI itinerary generator — future-ready structure */
export async function generateItineraryFromGuides(
  preferences: ItineraryPreferences,
  guides: Guide[],
): Promise<{ guide_slugs: string[]; summary: string; days: { day: number; stops: string[] }[] }> {
  const scored = guides.map((g) => {
    let score = 0;
    if (preferences.nightlife && g.categories.includes("nightlife")) score += 3;
    if (preferences.nature && g.categories.includes("nature")) score += 3;
    if (preferences.food && g.categories.includes("food")) score += 3;
    if (preferences.culture && g.categories.includes("culture")) score += 3;
    if (preferences.hiking && g.categories.includes("adventure")) score += 2;
    if (g.duration_days === preferences.duration_days) score += 5;
    if (g.price <= preferences.budget_eur) score += 2;
    if (g.featured) score += 1;
    return { guide: g, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, Math.min(3, scored.length)).map((s) => s.guide);
  const days: { day: number; stops: string[] }[] = [];

  for (let d = 1; d <= preferences.duration_days; d++) {
    const guide = top[(d - 1) % top.length];
    const day = guide?.days?.find((gd) => gd.day_number === d) ?? guide?.days?.[0];
    const stops = day?.stops?.map((s) => s.name) ?? [];
    days.push({ day: d, stops: stops.length ? stops : [`Explore ${guide?.title ?? "Kosovo"}`] });
  }

  return {
    guide_slugs: top.map((g) => g.slug),
    summary: `Personalized ${preferences.duration_days}-day Kosovo itinerary based on your interests: ${preferences.interests.join(", ") || "general exploration"}.`,
    days,
  };
}
