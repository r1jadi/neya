import { createAdminClient } from "@/lib/supabase/admin";
import { syncGuestlistEntryFromRequest } from "@/lib/guestlist/sync-entry";
import {
  listApprovedGuestlistRequestsForAdmin,
  listGuestlistEntriesForAdmin,
  listGuestlistRequestsForAdmin,
} from "@/services/guestlist";
import type { GuestlistEntryRow } from "@/types/guestlist";
import { loadVenueAccounts } from "@/services/venue-accounts";
import type { VenueAccountRow } from "@/types/auth";
import type { GuestlistRequestWithEvent } from "@/types/guestlist";

export type AdminVenueRow = {
  id: string;
  slug: string;
  name: string;
  city_slug: string;
  category: string;
  description: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  image_url: string | null;
  gallery_urls: string[];
  music_genres: string[];
  opening_hours: Record<string, unknown> | null;
  social_links: Record<string, string>;
  reservations_enabled: boolean;
  reservation_price_eur: number;
  requires_online_payment: boolean;
  allows_pay_at_venue: boolean;
  vip_enabled: boolean;
  approved: boolean;
  rejected: boolean;
  is_featured: boolean;
  is_trending: boolean;
  price_level: number;
  created_at: string;
};

export type AdminEventRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  venue_id: string;
  starts_at: string;
  ends_at: string | null;
  genre: string | null;
  image_url: string | null;
  dj_lineup: string[];
  capacity: number | null;
  is_featured: boolean;
  is_listed_public: boolean;
  is_hidden_premium: boolean;
  ticket_from_eur: number | null;
  reservation_price_eur: number | null;
  requires_online_payment: boolean | null;
  allows_pay_at_venue: boolean | null;
  venues: { name: string; slug: string } | { name: string; slug: string }[] | null;
};

export type AdminTicketRow = {
  id: string;
  event_id: string;
  tier_name: string;
  price_cents: number;
  currency: string;
  quantity_total: number | null;
  quantity_sold: number | null;
};

export type AdminGuestlistRow = {
  id: string;
  event_id: string;
  name: string;
  capacity: number | null;
  is_vip: boolean;
  is_open: boolean;
  requires_manual_approval: boolean;
};

export type AdminReservationRow = {
  id: string;
  status: string;
  party_size: number;
  deposit_cents: number | null;
  payment_method: string | null;
  payment_status: string;
  booking_kind: string;
  notes: string | null;
  created_at: string;
  events: { title: string } | { title: string }[] | null;
  venues: { name: string } | { name: string }[] | null;
};

export async function getAdminDashboardData() {
  const admin = createAdminClient();

  const [venuesRes, eventsRes, ticketsRes, guestlistsRes, reservationsRes, analyticsRes, venueAccountsRes] =
    await Promise.all([
    admin
      .from("venues")
      .select(
        "id, slug, name, city_slug, category, description, address, lat, lng, image_url, gallery_urls, music_genres, opening_hours, social_links, reservations_enabled, reservation_price_eur, requires_online_payment, allows_pay_at_venue, vip_enabled, approved, rejected, is_featured, is_trending, price_level, created_at",
      )
      .order("created_at", { ascending: false }),
    admin
      .from("events")
      .select(
        "id, slug, title, description, venue_id, starts_at, ends_at, genre, image_url, dj_lineup, capacity, is_featured, is_listed_public, is_hidden_premium, ticket_from_eur, reservation_price_eur, requires_online_payment, allows_pay_at_venue, venues(name, slug)",
      )
      .order("starts_at", { ascending: false })
      .limit(200),
    admin.from("tickets").select("id, event_id, tier_name, price_cents, currency, quantity_total, quantity_sold").order("created_at", { ascending: false }),
    admin
      .from("guestlists")
      .select("id, event_id, name, capacity, is_vip, is_open, requires_manual_approval")
      .order("created_at", { ascending: false }),
    admin
      .from("reservations")
      .select("id, status, party_size, deposit_cents, payment_method, payment_status, booking_kind, notes, created_at, events(title), venues(name)")
      .order("created_at", { ascending: false })
      .limit(100),
    admin.from("analytics").select("id", { count: "exact", head: true }),
    loadVenueAccounts(admin),
  ]);

  const venueCount = venuesRes.data?.length ?? 0;
  const approvedVenues = venuesRes.data?.filter((v) => v.approved && !v.rejected).length ?? 0;
  const pendingVenues = venuesRes.data?.filter((v) => !v.approved && !v.rejected).length ?? 0;
  const eventCount = eventsRes.data?.length ?? 0;
  const listedEvents = eventsRes.data?.filter((e) => e.is_listed_public).length ?? 0;

  let guestlistRequests: GuestlistRequestWithEvent[] = [];
  let guestlistEntries: GuestlistEntryRow[] = [];
  try {
    guestlistRequests = await listGuestlistRequestsForAdmin({ limit: 300 });
  } catch {
    guestlistRequests = [];
  }
  try {
    guestlistEntries = await listGuestlistEntriesForAdmin({ limit: 500 });
    const approvedRequests = await listApprovedGuestlistRequestsForAdmin({ limit: 500 });
    if (approvedRequests.length > guestlistEntries.length) {
      await Promise.all(
        approvedRequests.map((r) => syncGuestlistEntryFromRequest(admin, r.id)),
      );
      guestlistEntries = await listGuestlistEntriesForAdmin({ limit: 500 });
    }
  } catch (err) {
    console.error("[admin] guestlist entries load error:", err);
    guestlistEntries = [];
  }

  const venueAccounts = venueAccountsRes.accounts;
  if (venueAccountsRes.error) {
    console.error("[admin] venue accounts load error:", venueAccountsRes.error);
  }

  return {
    venues: (venuesRes.data ?? []) as AdminVenueRow[],
    events: (eventsRes.data ?? []) as AdminEventRow[],
    tickets: (ticketsRes.data ?? []) as AdminTicketRow[],
    guestlists: (guestlistsRes.data ?? []) as AdminGuestlistRow[],
    guestlistRequests,
    guestlistEntries,
    reservations: (reservationsRes.data ?? []) as AdminReservationRow[],
    venueAccounts: venueAccounts as VenueAccountRow[],
    venueAccountsError: venueAccountsRes.error,
    stats: {
      venueCount,
      approvedVenues,
      pendingVenues,
      eventCount,
      listedEvents,
      analyticsRows: analyticsRes.count ?? 0,
    },
  };
}
