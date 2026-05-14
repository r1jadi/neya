import type { SupabaseClient } from "@supabase/supabase-js";

export type ActivityVerb =
  | "joined_guestlist"
  | "checked_in"
  | "bought_ticket"
  | "confirmed_table"
  | "pulse_vote";

export async function logUserActivity(
  supabase: SupabaseClient,
  userId: string,
  verb: ActivityVerb,
  objectType: string,
  objectId: string | null,
  meta: Record<string, unknown> = {},
) {
  const { error } = await supabase.from("activity_feed").insert({
    actor_id: userId,
    verb,
    object_type: objectType,
    object_id: objectId,
    meta,
  });
  if (error) console.error("[neya] logUserActivity", error.message);
}

export async function logSystemActivity(
  admin: SupabaseClient,
  verb: ActivityVerb,
  objectType: string,
  objectId: string | null,
  meta: Record<string, unknown> = {},
) {
  const { error } = await admin.from("activity_feed").insert({
    actor_id: null,
    verb,
    object_type: objectType,
    object_id: objectId,
    meta,
  });
  if (error) console.error("[neya] logSystemActivity", error.message);
}
