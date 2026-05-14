import { getPublicSupabase } from "@/lib/supabase/public-server";

export type ActivityFeedItem = {
  id: string;
  verb: string;
  object_type: string;
  object_id: string | null;
  meta: Record<string, unknown>;
  created_at: string;
};

export async function getRecentActivity(limit = 24): Promise<ActivityFeedItem[]> {
  const sb = getPublicSupabase();
  if (!sb) return [];

  const { data, error } = await sb
    .from("activity_feed")
    .select("id, verb, object_type, object_id, meta, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[neya] getRecentActivity", error.message);
    return [];
  }
  return (data ?? []) as ActivityFeedItem[];
}
