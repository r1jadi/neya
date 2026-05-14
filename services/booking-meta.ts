import { getPublicSupabase } from "@/lib/supabase/public-server";

export type EventBookingMeta = {
  eventUuid: string;
  venueUuid: string;
  guestlistId: string | null;
  ticketId: string | null;
  /** True when a ticket tier exists but every tier is sold out */
  ticketSoldOut: boolean;
  /** At least one ticket row exists for this event */
  hasTicketRows: boolean;
};

export async function getEventBookingMetaBySlug(slug: string): Promise<EventBookingMeta | null> {
  const sb = getPublicSupabase();
  if (!sb) return null;

  const { data: ev, error: evErr } = await sb.from("events").select("id, venue_id").eq("slug", slug).maybeSingle();
  if (evErr || !ev) return null;

  const { data: gl } = await sb.from("guestlists").select("id").eq("event_id", ev.id).limit(1).maybeSingle();

  const { data: tickets } = await sb
    .from("tickets")
    .select("id, price_cents, quantity_total, quantity_sold")
    .eq("event_id", ev.id)
    .order("price_cents", { ascending: true });

  let ticketId: string | null = null;
  let ticketSoldOut = false;
  const hasTicketRows = Boolean(tickets?.length);

  if (tickets?.length) {
    const anyAvailable = tickets.some((t) => {
      const cap = t.quantity_total;
      const sold = t.quantity_sold ?? 0;
      return cap == null || sold < cap;
    });
    ticketSoldOut = !anyAvailable;
    const firstAvailable = tickets.find((t) => {
      const cap = t.quantity_total;
      const sold = t.quantity_sold ?? 0;
      return cap == null || sold < cap;
    });
    ticketId = firstAvailable?.id ?? null;
  }

  return {
    eventUuid: ev.id,
    venueUuid: ev.venue_id,
    guestlistId: gl?.id ?? null,
    ticketId,
    ticketSoldOut,
    hasTicketRows,
  };
}

export async function getVenueMetaBySlug(slug: string): Promise<{ venueUuid: string } | null> {
  const sb = getPublicSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from("venues").select("id").eq("slug", slug).maybeSingle();
  if (error || !data) return null;
  return { venueUuid: data.id };
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
