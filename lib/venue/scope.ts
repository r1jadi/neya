import { createAdminClient } from "@/lib/supabase/admin";

/** Resolve venue IDs a user may manage (owner listings + assigned venue account). */
export async function getManagedVenueIds(userId: string, assignedVenueId?: string | null): Promise<string[]> {
  const ids = new Set<string>();
  if (assignedVenueId) ids.add(assignedVenueId);

  try {
    const admin = createAdminClient();
    const { data: owned } = await admin.from("venues").select("id").eq("owner_id", userId);
    owned?.forEach((v) => ids.add(v.id));
  } catch {
    // service role unavailable in dev
  }

  return [...ids];
}

export async function getEventIdsForVenues(venueIds: string[]): Promise<string[]> {
  if (!venueIds.length) return [];
  const admin = createAdminClient();
  const { data: events } = await admin.from("events").select("id").in("venue_id", venueIds);
  return events?.map((e) => e.id) ?? [];
}
