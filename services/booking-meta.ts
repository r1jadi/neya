import { getPublicSupabase } from "@/lib/supabase/public-server";
import {
  resolveReservationConfig,
  type ResolvedReservationConfig,
} from "@/lib/reservations/config";
import { getEventGuestlistMeta } from "@/services/guestlist";
import type { GuestlistAvailability, GuestlistConfig } from "@/types/guestlist";

export type EventBookingMeta = {
  eventUuid: string;
  venueUuid: string | null;
  guestlist: GuestlistConfig | null;
  guestlistAvailability: GuestlistAvailability | null;
  /** @deprecated Use guestlist.id */
  guestlistId: string | null;
  ticketId: string | null;
  /** True when a ticket tier exists but every tier is sold out */
  ticketSoldOut: boolean;
  /** At least one ticket row exists for this event */
  hasTicketRows: boolean;
  ticketTypes: TicketType[];
  reservation: ResolvedReservationConfig;
};

export type TicketType = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  quantityAvailable: number | null;
  status: "available" | "sold_out" | "closed";
  salesEnd: string | null;
};

const VENUE_RESERVATION_SELECT =
  "reservation_price_eur, requires_online_payment, allows_pay_at_venue, reservations_enabled";

export async function getEventBookingMetaBySlug(slug: string): Promise<EventBookingMeta | null> {
  const sb = getPublicSupabase();
  if (!sb) return null;

  const { data: ev, error: evErr } = await sb
    .from("events")
    .select(
      `id, venue_id, reservation_price_eur, requires_online_payment, allows_pay_at_venue, reservations_enabled, venues(${VENUE_RESERVATION_SELECT})`,
    )
    .eq("slug", slug)
    .maybeSingle();
  if (evErr || !ev) return null;

  const venueRaw = ev.venues as ReservationVenueRow | ReservationVenueRow[] | null;
  const venue = Array.isArray(venueRaw) ? venueRaw[0] : venueRaw;

  // Events can exist without a venue (venue is optional), and venue-less
  // events support reservations too (the event itself carries the config).
  // The meta must NEVER be dropped for a missing venue — tickets always load.
  const reservation = resolveReservationConfig(venue, {
    reservation_price_eur: ev.reservation_price_eur,
    requires_online_payment: ev.requires_online_payment,
    allows_pay_at_venue: ev.allows_pay_at_venue,
    reservations_enabled: ev.reservations_enabled,
  });

  const guestlistMeta = await getEventGuestlistMeta(ev.id);

  const { data: tickets } = await sb
    .from("tickets")
    .select("id, tier_name, description, price_cents, currency, quantity_total, quantity_sold, quantity_reserved, sales_start, sales_end, status")
    .eq("event_id", ev.id)
    .order("price_cents", { ascending: true });

  const now = Date.now();
  const ticketTypes: TicketType[] = (tickets ?? []).map((ticket) => {
    const quantityAvailable = ticket.quantity_total == null ? null : Math.max(0, ticket.quantity_total - (ticket.quantity_sold ?? 0) - (ticket.quantity_reserved ?? 0));
    const outsideSalesWindow = (ticket.sales_start && new Date(ticket.sales_start).getTime() > now) || (ticket.sales_end && new Date(ticket.sales_end).getTime() <= now);
    const status: TicketType["status"] = ticket.status === "available" && !outsideSalesWindow && (quantityAvailable == null || quantityAvailable > 0) ? "available" : ticket.status === "closed" || outsideSalesWindow ? "closed" : "sold_out";
    return { id: ticket.id, name: ticket.tier_name, description: ticket.description ?? null, priceCents: ticket.price_cents, currency: ticket.currency ?? "EUR", quantityAvailable, status, salesEnd: ticket.sales_end ?? null };
  });
  let ticketId: string | null = null;
  let ticketSoldOut = false;
  const hasTicketRows = Boolean(tickets?.length);

  if (tickets?.length) {
    const anyAvailable = ticketTypes.some((ticket) => ticket.status === "available");
    ticketSoldOut = !anyAvailable;
    const firstAvailable = ticketTypes.find((ticket) => ticket.status === "available");
    ticketId = firstAvailable?.id ?? null;
  }

  return {
    eventUuid: ev.id,
    venueUuid: ev.venue_id,
    guestlist: guestlistMeta?.guestlist ?? null,
    guestlistAvailability: guestlistMeta?.availability ?? null,
    guestlistId: guestlistMeta?.guestlist?.id ?? null,
    ticketId,
    ticketSoldOut,
    hasTicketRows,
    ticketTypes,
    reservation,
  };
}

type ReservationVenueRow = {
  reservation_price_eur: number | null;
  requires_online_payment: boolean | null;
  allows_pay_at_venue: boolean | null;
  reservations_enabled: boolean | null;
};

export type VenueBookingMeta = {
  venueUuid: string;
  reservation: ResolvedReservationConfig;
};

export async function getVenueMetaBySlug(slug: string): Promise<VenueBookingMeta | null> {
  const sb = getPublicSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from("venues")
    .select(`id, ${VENUE_RESERVATION_SELECT}`)
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) return null;
  return {
    venueUuid: data.id,
    reservation: resolveReservationConfig(data),
  };
}

export async function getPublicCheckinCount(venueId: string): Promise<number> {
  const sb = getPublicSupabase();
  if (!sb) return 0;
  const since = new Date(Date.now() - 18 * 3600000).toISOString();
  const { count, error } = await sb
    .from("checkins")
    .select("id", { count: "exact", head: true })
    .eq("venue_id", venueId)
    .eq("visibility", "public")
    .gte("created_at", since);
  if (error) return 0;
  return count ?? 0;
}
