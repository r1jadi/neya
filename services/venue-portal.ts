import { createAdminClient } from "@/lib/supabase/admin";
import { getEventIdsForVenues } from "@/lib/venue/scope";
import type { GuestlistRequestWithEvent } from "@/types/guestlist";

export type VenuePortalStats = {
  reservationCount: number;
  guestlistRequestCount: number;
  pendingGuestlistCount: number;
  upcomingEventCount: number;
};

export async function getVenuePortalStats(venueId: string): Promise<VenuePortalStats> {
  const admin = createAdminClient();
  const eventIds = await getEventIdsForVenues([venueId]);

  const [{ count: reservationCount }, { count: guestlistRequestCount }, { count: pendingGuestlistCount }, { count: upcomingEventCount }] =
    await Promise.all([
      admin.from("reservations").select("id", { count: "exact", head: true }).eq("venue_id", venueId),
      eventIds.length
        ? admin.from("guestlist_requests").select("id", { count: "exact", head: true }).in("event_id", eventIds)
        : Promise.resolve({ count: 0 }),
      eventIds.length
        ? admin
            .from("guestlist_requests")
            .select("id", { count: "exact", head: true })
            .in("event_id", eventIds)
            .eq("status", "pending")
        : Promise.resolve({ count: 0 }),
      admin
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("venue_id", venueId)
        .gte("starts_at", new Date().toISOString()),
    ]);

  return {
    reservationCount: reservationCount ?? 0,
    guestlistRequestCount: guestlistRequestCount ?? 0,
    pendingGuestlistCount: pendingGuestlistCount ?? 0,
    upcomingEventCount: upcomingEventCount ?? 0,
  };
}

export async function listGuestlistRequestsForVenue(
  venueId: string,
  limit = 150,
): Promise<GuestlistRequestWithEvent[]> {
  const eventIds = await getEventIdsForVenues([venueId]);
  if (!eventIds.length) return [];

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("guestlist_requests")
    .select(
      "id, event_id, guestlist_id, user_id, first_name, last_name, full_name, phone, email, group_size, notes, status, created_at, updated_at, checked_in_at, approved_by, events(title, slug)",
    )
    .in("event_id", eventIds)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as GuestlistRequestWithEvent[];
}

export async function getVenueWithEvents(venueId: string) {
  const admin = createAdminClient();
  const [{ data: venue }, { data: events }] = await Promise.all([
    admin.from("venues").select("id, name, slug, approved, city_slug, category").eq("id", venueId).maybeSingle(),
    admin
      .from("events")
      .select("id, title, slug, starts_at, is_listed_public")
      .eq("venue_id", venueId)
      .order("starts_at", { ascending: false })
      .limit(50),
  ]);
  return { venue, events: events ?? [] };
}
