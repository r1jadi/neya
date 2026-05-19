import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { VenueAccountRow } from "@/types/auth";
import type { SupabaseClient } from "@supabase/supabase-js";

type ProfileRow = {
  id: string;
  display_name: string | null;
  venue_id: string | null;
  account_active: boolean;
  created_at: string;
  role: string;
};

export type VenueAccountsLoadResult = {
  accounts: VenueAccountRow[];
  error: string | null;
};

/**
 * Load venue partner accounts using an existing service-role client.
 */
export async function loadVenueAccounts(
  admin: SupabaseClient,
): Promise<VenueAccountsLoadResult> {
  try {
    const { data: profiles, error: profileErr } = await admin
      .from("profiles")
      .select("id, display_name, venue_id, account_active, created_at, role")
      .eq("role", "venue")
      .order("created_at", { ascending: false });

    if (profileErr) {
      console.error("[venue-account] list profiles failed", profileErr);
      return { accounts: [], error: profileErr.message };
    }

    if (!profiles?.length) {
      return { accounts: [], error: null };
    }

    const venueIds = [...new Set(profiles.map((p) => p.venue_id).filter(Boolean))] as string[];
    const venueById = new Map<string, { id: string; name: string; slug: string }>();

    if (venueIds.length) {
      const { data: venues, error: venueErr } = await admin.from("venues").select("id, name, slug").in("id", venueIds);
      if (venueErr) {
        console.error("[venue-account] list venues failed", venueErr);
        // Still return accounts without venue names
      } else {
        venues?.forEach((v) => venueById.set(v.id, v));
      }
    }

    const emailById = await fetchAuthEmails(admin, profiles.map((p) => p.id));

    const accounts = (profiles as ProfileRow[]).map((p) => ({
      id: p.id,
      email: emailById.get(p.id) ?? "—",
      display_name: p.display_name,
      venue_id: p.venue_id,
      account_active: p.account_active ?? true,
      created_at: p.created_at,
      venues: p.venue_id ? (venueById.get(p.venue_id) ?? null) : null,
    }));

    console.info(`[venue-account] loaded ${accounts.length} account(s)`);
    return { accounts, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error loading venue accounts";
    console.error("[venue-account] load failed", err);
    return { accounts: [], error: message };
  }
}

/** Standalone loader (creates its own admin client). */
export async function listVenueAccounts(): Promise<VenueAccountsLoadResult> {
  return loadVenueAccounts(createAdminClient());
}

async function fetchAuthEmails(
  admin: SupabaseClient,
  userIds: string[],
): Promise<Map<string, string>> {
  const emailById = new Map<string, string>();
  if (!userIds.length) return emailById;

  const needIds = new Set(userIds);

  try {
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (!error && data?.users) {
      for (const u of data.users) {
        if (needIds.has(u.id) && u.email) emailById.set(u.id, u.email);
      }
    }
  } catch (err) {
    console.error("[venue-account] listUsers failed, falling back to getUserById", err);
  }

  const missing = userIds.filter((id) => !emailById.has(id));
  await Promise.all(
    missing.map(async (id) => {
      try {
        const { data, error } = await admin.auth.admin.getUserById(id);
        if (!error && data?.user?.email) emailById.set(id, data.user.email);
      } catch {
        // keep em dash
      }
    }),
  );

  return emailById;
}
