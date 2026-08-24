import { createClient } from "@/lib/supabase/server";
import { getPublicSupabase } from "@/lib/supabase/public-server";
import type { MyNightPlan, NightStopDisplay } from "@/types";

type StopRow = {
  id: string;
  position: number;
  venue_id: string | null;
  event_id: string | null;
};

type VenueRow = {
  id: string;
  slug: string;
  name: string;
  image_url: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
};

type EventRow = {
  id: string;
  slug: string;
  title: string;
  starts_at: string;
  ends_at?: string | null;
  image_url: string | null;
  venues?:
    | { id: string; slug: string; name: string; image_url?: string | null; lat?: number | null; lng?: number | null }
    | { id: string; slug: string; name: string; image_url?: string | null; lat?: number | null; lng?: number | null }[]
    | null;
};

function oneOrArray<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function unavailableStop(row: StopRow): NightStopDisplay {
  return {
    stopId: row.id,
    kind: row.event_id ? "event" : "venue",
    refId: row.event_id ?? row.venue_id ?? "",
    title: "No longer available",
    subtitle: "This night was removed from NEYA.",
    time: null,
    image: null,
    slug: null,
    lat: null,
    lng: null,
    available: false,
  };
}

/**
 * Resolve raw stop rows into display cards. Venues must be approved and
 * events publicly listed; anything else renders as an unavailable stop.
 */
export async function resolveStopsForDisplay(rows: StopRow[]): Promise<NightStopDisplay[]> {
  if (!rows.length) return [];
  const ordered = [...rows].sort((a, b) => a.position - b.position);

  const venueIds = ordered.filter((r) => r.venue_id).map((r) => r.venue_id as string);
  const eventIds = ordered.filter((r) => r.event_id).map((r) => r.event_id as string);

  const supabase = await createClient();
  const [venuesRes, eventsRes] = await Promise.all([
    venueIds.length
      ? supabase
          .from("venues")
          .select("id, slug, name, image_url, address, lat, lng")
          .in("id", venueIds)
          .eq("approved", true)
          .eq("rejected", false)
      : Promise.resolve({ data: [] as unknown[] }),
    eventIds.length
      ? supabase
          .from("events")
          .select("id, slug, title, starts_at, ends_at, image_url, venues(id, slug, name, image_url, lat, lng)")
          .in("id", eventIds)
          .eq("is_listed_public", true)
      : Promise.resolve({ data: [] as unknown[] }),
  ]);

  const venueData = (venuesRes.data ?? []) as VenueRow[];
  const eventData = (eventsRes.data ?? []) as EventRow[];
  const venues = new Map(venueData.map((v) => [v.id, v]));
  const events = new Map(eventData.map((e) => [e.id, e]));

  return ordered.map((row): NightStopDisplay => {
    if (row.venue_id) {
      const venue = venues.get(row.venue_id);
      if (!venue) return unavailableStop(row);
      return {
        stopId: row.id,
        kind: "venue",
        refId: venue.id,
        title: venue.name,
        subtitle: venue.address,
        time: null,
        image: venue.image_url,
        slug: venue.slug,
        lat: venue.lat,
        lng: venue.lng,
        available: true,
      };
    }
    if (row.event_id) {
      const event = events.get(row.event_id);
      if (!event) return unavailableStop(row);
      const venue = oneOrArray(event.venues);
      return {
        stopId: row.id,
        kind: "event",
        refId: event.id,
        title: event.title,
        subtitle: venue?.name ?? "Venue TBA",
        time: event.starts_at,
        endsAt: event.ends_at ?? null,
        image: event.image_url,
        slug: event.slug,
        lat: venue?.lat ?? null,
        lng: venue?.lng ?? null,
        available: true,
      };
    }
    return unavailableStop(row);
  });
}

async function loadPlanRows(
  supabase: Awaited<ReturnType<typeof createClient>> | Awaited<ReturnType<typeof getPublicSupabase>> | null,
  planId: string,
): Promise<StopRow[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("night_plan_stops")
    .select("id, position, venue_id, event_id")
    .eq("plan_id", planId)
    .order("position", { ascending: true });
  return (data ?? []) as StopRow[];
}

/** The user's active (private) plan with resolved stops, or null. */
export async function getActivePlanForUser(userId: string): Promise<MyNightPlan | null> {
  if (!userId) return null;
  const supabase = await createClient();
  const { data: plan } = await supabase
    .from("night_plans")
    .select("id, title")
    .eq("user_id", userId)
    .is("share_token", null)
    .maybeSingle();
  if (!plan) return null;
  const stops = await resolveStopsForDisplay(await loadPlanRows(supabase, plan.id));
  return { planId: plan.id, title: plan.title, stops };
}

/** A shared snapshot by its token — public, no auth required. */
export async function getSharedPlanByToken(token: string): Promise<MyNightPlan | null> {
  if (!token) return null;
  const supabase = getPublicSupabase();
  if (!supabase) return null;
  const { data: plan } = await supabase
    .from("night_plans")
    .select("id, title")
    .eq("share_token", token)
    .maybeSingle();
  if (!plan) return null;
  const stops = await resolveStopsForDisplay(await loadPlanRows(supabase, plan.id));
  return { planId: plan.id, title: plan.title, stops };
}


