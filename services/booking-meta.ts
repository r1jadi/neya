import { getPublicSupabase } from "@/lib/supabase/public-server";

export type EventBookingMeta = {
  eventUuid: string;
  venueUuid: string;
  guestlistId: string | null;
  ticketId: string | null;
};

const empty: EventBookingMeta | null = null;

/** Real UUIDs from DB for checkout / guestlist (null if event not in Supabase). */
export async function getEventBookingMetaBySlug(slug: string): Promise<EventBookingMeta | null> {
  const sb = getPublicSupabase();
  if (!sb) return null;

  const { data: ev, error: evErr } = await sb.from("events").select("id, venue_id").eq("slug", slug).maybeSingle();
  if (evErr || !ev) return null;

  const { data: gl } = await sb.from("guestlists").select("id").eq("event_id", ev.id).limit(1).maybeSingle();

  const { data: tk } = await sb
    .from("tickets")
    .select("id, quantity_total, quantity_sold")
    .eq("event_id", ev.id)
    .order("price_cents", { ascending: true })
    .limit(1)
    .maybeSingle();

  let ticketId: string | null = null;
  if (tk) {
    const cap = tk.quantity_total;
    const sold = tk.quantity_sold ?? 0;
    if (cap == null || sold < cap) ticketId = tk.id;
  }

  return {
    eventUuid: ev.id,
    venueUuid: ev.venue_id,
    guestlistId: gl?.id ?? null,
    ticketId,
  };
}

export async function getVenueMetaBySlug(slug: string): Promise<{ venueUuid: string } | null> {
  const sb = getPublicSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from("venues").select("id").eq("slug", slug).maybeSingle();
  if (error || !data) return null;
  return { venueUuid: data.id };
}
