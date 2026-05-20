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

function isMissingColumnError(message: string): boolean {
  return (
    message.includes("guestlist_request_id") ||
    message.includes("full_name") ||
    message.includes("does not exist") ||
    message.includes("schema cache")
  );
}

/**
 * Keep guestlist_entries in sync with guestlist_requests for door-list / analytics.
 * No-ops gracefully if migration 20240523120000 has not been applied yet.
 */
export async function syncGuestlistEntryFromRequest(
  admin: SupabaseClient,
  requestId: string,
): Promise<{ ok: boolean; error?: string; skipped?: boolean }> {
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
    if (delErr && !isMissingColumnError(delErr.message)) {
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

  const { data: existing, error: findErr } = await admin
    .from("guestlist_entries")
    .select("id")
    .eq("guestlist_request_id", requestId)
    .maybeSingle();

  if (findErr) {
    if (isMissingColumnError(findErr.message)) {
      return { ok: true, skipped: true };
    }
    console.error("[guestlist] sync find entry failed", findErr);
    return { ok: false, error: findErr.message };
  }

  if (existing?.id) {
    const { error: updateErr } = await admin
      .from("guestlist_entries")
      .update(entryPayload)
      .eq("id", existing.id);
    if (updateErr) {
      if (isMissingColumnError(updateErr.message)) return { ok: true, skipped: true };
      console.error("[guestlist] sync update failed", updateErr);
      return { ok: false, error: updateErr.message };
    }
    return { ok: true };
  }

  const { error: insertErr } = await admin.from("guestlist_entries").insert(entryPayload);
  if (insertErr) {
    if (insertErr.code === "23505" && row.user_id) {
      const { error: updateErr } = await admin
        .from("guestlist_entries")
        .update(entryPayload)
        .eq("guestlist_id", row.guestlist_id)
        .eq("user_id", row.user_id);
      if (!updateErr) return { ok: true };
    }
    if (isMissingColumnError(insertErr.message)) return { ok: true, skipped: true };
    console.error("[guestlist] sync insert failed", insertErr);
    return { ok: false, error: insertErr.message };
  }

  return { ok: true };
}
