import { resolveGuestlistAvailability } from "@/lib/guestlist/capacity";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublicSupabase } from "@/lib/supabase/public-server";
import type {
  GuestlistAvailability,
  GuestlistConfig,
  GuestlistRequestWithEvent,
} from "@/types/guestlist";

export type EventGuestlistMeta = {
  eventId: string;
  guestlist: GuestlistConfig | null;
  availability: GuestlistAvailability | null;
};

export async function getEventGuestlistMeta(eventId: string): Promise<EventGuestlistMeta | null> {
  const sb = getPublicSupabase();
  if (!sb) return null;

  const { data: gl } = await sb
    .from("guestlists")
    .select("id, event_id, name, capacity, is_vip, is_open, requires_manual_approval")
    .eq("event_id", eventId)
    .limit(1)
    .maybeSingle();

  if (!gl) {
    return { eventId, guestlist: null, availability: null };
  }

  const { data: spotsUsedRaw } = await sb.rpc("guestlist_spots_used", { p_event_id: eventId });
  const spotsUsed = typeof spotsUsedRaw === "number" ? spotsUsedRaw : 0;
  const config: GuestlistConfig = {
    id: gl.id,
    eventId: gl.event_id,
    name: gl.name,
    capacity: gl.capacity,
    isVip: gl.is_vip ?? false,
    isOpen: gl.is_open ?? true,
    requiresManualApproval: gl.requires_manual_approval ?? true,
  };

  const availability = resolveGuestlistAvailability(
    {
      capacity: config.capacity,
      isOpen: config.isOpen,
      requiresManualApproval: config.requiresManualApproval,
    },
    spotsUsed,
  );

  return { eventId, guestlist: config, availability };
}

export async function getEventGuestlistMetaBySlug(slug: string): Promise<EventGuestlistMeta | null> {
  const sb = getPublicSupabase();
  if (!sb) return null;

  const { data: ev } = await sb.from("events").select("id").eq("slug", slug).maybeSingle();
  if (!ev) return null;

  return getEventGuestlistMeta(ev.id);
}

export async function listGuestlistRequestsForAdmin(filters?: {
  eventId?: string;
  status?: string;
  search?: string;
  limit?: number;
}): Promise<GuestlistRequestWithEvent[]> {
  const admin = createAdminClient();
  let query = admin
    .from("guestlist_requests")
    .select(
      "id, event_id, guestlist_id, user_id, first_name, last_name, full_name, phone, email, group_size, notes, status, created_at, updated_at, checked_in_at, approved_by, events(title, slug)",
    )
    .order("created_at", { ascending: false })
    .limit(filters?.limit ?? 200);

  if (filters?.eventId) query = query.eq("event_id", filters.eventId);
  if (filters?.status) query = query.eq("status", filters.status);

  const { data, error } = await query;
  if (error) throw error;

  let rows = (data ?? []) as GuestlistRequestWithEvent[];
  const search = filters?.search?.trim().toLowerCase();
  if (search) {
    rows = rows.filter(
      (r) =>
        r.full_name.toLowerCase().includes(search) ||
        r.phone.includes(search) ||
        (r.email?.toLowerCase().includes(search) ?? false),
    );
  }
  return rows;
}

export async function listGuestlistRequestsForVenueOwner(
  ownerId: string,
  limit = 100,
): Promise<GuestlistRequestWithEvent[]> {
  const admin = createAdminClient();
  const { data: venues } = await admin.from("venues").select("id").eq("owner_id", ownerId);
  const venueIds = venues?.map((v) => v.id) ?? [];
  if (!venueIds.length) return [];

  const { data: events } = await admin.from("events").select("id").in("venue_id", venueIds);
  const eventIds = events?.map((e) => e.id) ?? [];
  if (!eventIds.length) return [];

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
