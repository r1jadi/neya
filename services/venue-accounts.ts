import { createAdminClient } from "@/lib/supabase/admin";
import type { VenueAccountRow } from "@/types/auth";

export async function listVenueAccounts(): Promise<VenueAccountRow[]> {
  const admin = createAdminClient();
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, display_name, venue_id, account_active, created_at, venues(id, name, slug)")
    .eq("role", "venue")
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!profiles?.length) return [];

  const { data: authData, error: authErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (authErr) throw authErr;

  const emailById = new Map(authData.users.map((u) => [u.id, u.email ?? ""]));

  return profiles.map((p) => ({
    id: p.id,
    email: emailById.get(p.id) ?? "—",
    display_name: p.display_name,
    venue_id: p.venue_id,
    account_active: p.account_active,
    created_at: p.created_at,
    venues: p.venues as VenueAccountRow["venues"],
  }));
}
