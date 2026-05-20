import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { GuestlistRequestStatus } from "@/types/guestlist";

const ENTRY_STATUSES = new Set<GuestlistRequestStatus>(["approved", "checked_in"]);

type RequestRow = {
  id: string;
  guestlist_id: string | null;
  user_id: string | null;
  full_name: string;
  phone: string;
  group_size: number;
  status: GuestlistRequestStatus;
};

/**
 * Keep guestlist_entries in sync with guestlist_requests for door-list / analytics.
 */
export async function syncGuestlistEntryFromRequest(
  admin: SupabaseClient,
  requestId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { data: req, error: fetchErr } = await admin
    .from("guestlist_requests")
    .select("id, guestlist_id, user_id, full_name, phone, group_size, status")
    .eq("id", requestId)
    .maybeSingle();

  if (fetchErr) {
    console.error("[guestlist] sync fetch failed", fetchErr);
    return { ok: false, error: fetchErr.message };
  }
  if (!req) return { ok: true };

  const row = req as RequestRow;

  if (!ENTRY_STATUSES.has(row.status)) {
    const { error: delErr } = await admin
      .from("guestlist_entries")
      .delete()
      .eq("guestlist_request_id", requestId);
    if (delErr) {
      console.error("[guestlist] sync delete entry failed", delErr);
      return { ok: false, error: delErr.message };
    }
    return { ok: true };
  }

  if (!row.guestlist_id) {
    console.error("[guestlist] sync skipped — request missing guestlist_id", { requestId });
    return { ok: false, error: "Missing guestlist_id on request" };
  }

  const entryPayload = {
    guestlist_id: row.guestlist_id,
    guestlist_request_id: row.id,
    user_id: row.user_id,
    full_name: row.full_name,
    phone: row.phone,
    contact: row.phone,
    group_size: row.group_size,
    status: "approved" as const,
  };

  const { error: upsertErr } = await admin
    .from("guestlist_entries")
    .upsert(entryPayload, { onConflict: "guestlist_request_id" });

  if (upsertErr) {
    console.error("[guestlist] sync upsert failed", upsertErr);
    return { ok: false, error: upsertErr.message };
  }

  return { ok: true };
}
