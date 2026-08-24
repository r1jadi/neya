import { createClient } from "@/lib/supabase/server";

export type OrganizerVenueRow = {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  approved: boolean;
  category: string;
  city_slug: string;
};

export type OrganizerEventRow = {
  id: string;
  slug: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  submission_status: string | null;
  is_listed_public: boolean;
  image_url: string | null;
  ticket_from_eur: number | null;
  capacity: number | null;
  venue: { name: string; slug: string } | null;
  ticketsSold: number;
  revenueCents: number;
  reservationCount: number;
};

export type OrganizerDashboardData = {
  venues: OrganizerVenueRow[];
  events: OrganizerEventRow[];
  stats: {
    upcomingCount: number;
    totalReservations: number;
    pendingReservations: number;
    pendingGuestlist: number;
    ticketsSold: number;
    revenueCents: number;
  };
};

type EventRow = {
  id: string;
  slug: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  submission_status: string | null;
  is_listed_public: boolean;
  image_url: string | null;
  ticket_from_eur: number | null;
  capacity: number | null;
  venues: { name: string; slug: string } | { name: string; slug: string }[] | null;
};

type ReservationRow = { id: string; status: string; event_id: string | null };
type GuestlistRow = { event_id: string; status: string };
type TicketRow = { id: string; event_id: string };
type OrderRow = { ticket_id: string; quantity: number; amount_cents: number | null };

/**
 * Loads the organizer dashboard for a venue owner: owned venues, their events,
 * and real reservation / guestlist / ticket-sales metrics. Mirrors the RLS-safe
 * queries already used by /business/analytics — no service role, no bypass.
 */
export async function getOrganizerDashboard(userId: string): Promise<OrganizerDashboardData> {
  const supabase = await createClient();

  const { data: venues } = await supabase
    .from("venues")
    .select("id, name, slug, image_url, approved, category, city_slug")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });

  const venueIds = (venues ?? []).map((v) => v.id);

  if (!venueIds.length) {
    return {
      venues: venues ?? [],
      events: [],
      stats: {
        upcomingCount: 0,
        totalReservations: 0,
        pendingReservations: 0,
        pendingGuestlist: 0,
        ticketsSold: 0,
        revenueCents: 0,
      },
    };
  }

  const { data: events } = await supabase
    .from("events")
    .select(
      "id, slug, title, starts_at, ends_at, submission_status, is_listed_public, image_url, ticket_from_eur, capacity, venues(name, slug)",
    )
    .in("venue_id", venueIds)
    .order("starts_at", { ascending: false })
    .limit(200);

  const eventIds = (events ?? []).map((e: { id: string }) => e.id);

  const [{ data: reservations }, { data: tickets }] = await Promise.all([
    supabase
      .from("reservations")
      .select("id, status, event_id")
      .in("venue_id", venueIds)
      .order("created_at", { ascending: false })
      .limit(500),
    eventIds.length
      ? supabase.from("tickets").select("id, event_id").in("event_id", eventIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const ticketIds = (tickets ?? []).map((t: { id: string }) => t.id);

  let guestlistRows: GuestlistRow[] = [];
  let orderRows: OrderRow[] = [];
  if (eventIds.length) {
    const [{ data: gl }, { data: orders }] = await Promise.all([
      supabase
        .from("guestlist_requests")
        .select("event_id, status")
        .in("event_id", eventIds)
        .limit(1000),
      ticketIds.length
        ? supabase
            .from("ticket_orders")
            .select("ticket_id, quantity, amount_cents")
            .in("ticket_id", ticketIds)
            .eq("payment_status", "paid")
            .limit(2000)
        : Promise.resolve({ data: [] as OrderRow[] }),
    ]);
    guestlistRows = (gl ?? []) as GuestlistRow[];
    orderRows = (orders ?? []) as OrderRow[];
  }

  const resRows = (reservations ?? []) as ReservationRow[];
  const eventRows = (events ?? []) as EventRow[];

  const ticketEventByTicket = new Map<string, string>();
  (tickets ?? []).forEach((t) => ticketEventByTicket.set(t.id, t.event_id));

  const soldByEvent = new Map<string, number>();
  const revenueByEvent = new Map<string, number>();
  for (const order of orderRows) {
    const eventId = ticketEventByTicket.get(order.ticket_id);
    if (!eventId) continue;
    const qty = order.quantity > 0 ? order.quantity : 1;
    soldByEvent.set(eventId, (soldByEvent.get(eventId) ?? 0) + qty);
    if (order.amount_cents != null) {
      revenueByEvent.set(eventId, (revenueByEvent.get(eventId) ?? 0) + order.amount_cents);
    }
  }

  const reservationCountByEvent = new Map<string, number>();
  for (const r of resRows) {
    if (!r.event_id) continue;
    reservationCountByEvent.set(r.event_id, (reservationCountByEvent.get(r.event_id) ?? 0) + 1);
  }

  const pendingGuestlist = guestlistRows.filter((g) => g.status === "pending").length;
  const pendingReservations = resRows.filter(
    (r) => r.status === "pending" || r.status === "pending_payment",
  ).length;

  const now = new Date();
  const upcomingCount = eventRows.filter((e) => new Date(e.starts_at).getTime() > now.getTime()).length;

  const eventsOut: OrganizerEventRow[] = eventRows.map((e) => {
    const venue = Array.isArray(e.venues) ? e.venues[0] ?? null : e.venues;
    return {
      id: e.id,
      slug: e.slug,
      title: e.title,
      starts_at: e.starts_at,
      ends_at: e.ends_at,
      submission_status: e.submission_status,
      is_listed_public: e.is_listed_public,
      image_url: e.image_url,
      ticket_from_eur: e.ticket_from_eur,
      capacity: e.capacity,
      venue: venue ? { name: venue.name, slug: venue.slug } : null,
      ticketsSold: soldByEvent.get(e.id) ?? 0,
      revenueCents: revenueByEvent.get(e.id) ?? 0,
      reservationCount: reservationCountByEvent.get(e.id) ?? 0,
    };
  });

  return {
    venues: venues ?? [],
    events: eventsOut,
    stats: {
      upcomingCount,
      totalReservations: resRows.length,
      pendingReservations,
      pendingGuestlist,
      ticketsSold: [...soldByEvent.values()].reduce((a, b) => a + b, 0),
      revenueCents: [...revenueByEvent.values()].reduce((a, b) => a + b, 0),
    },
  };
}
