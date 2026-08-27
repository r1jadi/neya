import type { SupabaseClient } from "@supabase/supabase-js";

export type PublicSocialProfile = { id: string; display_name: string | null; avatar_url: string | null };
export type FriendshipStatus = "pending" | "accepted" | "blocked";
export type FriendRequest = { id: string; requester_id: string; addressee_id: string; status: FriendshipStatus; created_at: string };
export type SocialActivity = { id: string; actor: PublicSocialProfile; verb: string; object_type: "event" | "venue"; object_id: string | null; meta: Record<string, unknown>; created_at: string };
export type GroupNightInvite = { id: string; plan_id: string; inviter_id: string; invitee_id: string; status: "pending" | "accepted" | "declined" | "expired"; expires_at: string; created_at: string };
export type EventSocialCounts = { publicCheckins: number; friendsGoing: number; going: number; saved: number };

export async function getEventSocialCounts(eventId: string): Promise<EventSocialCounts> {
  if (!eventId) return { publicCheckins: 0, friendsGoing: 0, going: 0, saved: 0 };
  const client = (await import("@/lib/supabase/public-server")).getPublicSupabase();
  if (!client) return { publicCheckins: 0, friendsGoing: 0, going: 0, saved: 0 };
  const { count } = await client.from("checkins").select("id", { count: "exact", head: true }).eq("event_id", eventId).eq("visibility", "public");
  return { publicCheckins: count ?? 0, friendsGoing: 0, going: count ?? 0, saved: 0 };
}

export async function searchPublicUsers(client: SupabaseClient, viewerId: string, query: string, limit = 20): Promise<PublicSocialProfile[]> {
  const term = query.trim().replace(/[%_]/g, "").slice(0, 80);
  if (!term) return [];
  const { data } = await client.from("profiles").select("id, display_name, avatar_url").neq("id", viewerId).ilike("display_name", `%${term}%`).limit(Math.min(Math.max(limit, 1), 50));
  return (data ?? []) as PublicSocialProfile[];
}

export async function listFriendships(client: SupabaseClient, userId: string): Promise<FriendRequest[]> {
  const { data } = await client.from("friendships").select("id, requester_id, addressee_id, status, created_at").or(`requester_id.eq.${userId},addressee_id.eq.${userId}`).order("created_at", { ascending: false });
  return (data ?? []) as FriendRequest[];
}

export async function listGroupNightInvites(client: SupabaseClient, userId: string): Promise<GroupNightInvite[]> {
  const { data } = await client.from("group_night_invites").select("id, plan_id, inviter_id, invitee_id, status, expires_at, created_at").or(`inviter_id.eq.${userId},invitee_id.eq.${userId}`).order("created_at", { ascending: false });
  return ((data ?? []) as GroupNightInvite[]).map((invite) => invite.status === "pending" && new Date(invite.expires_at).getTime() <= Date.now() ? { ...invite, status: "expired" } : invite);
}

export async function listVisibleFriendActivity(client: SupabaseClient, userId: string, limit = 50): Promise<SocialActivity[]> {
  const friendships = await listFriendships(client, userId);
  const friendIds = friendships.filter((friendship) => friendship.status === "accepted").map((friendship) => friendship.requester_id === userId ? friendship.addressee_id : friendship.requester_id);
  if (!friendIds.length) return [];
  const { data } = await client.from("activity_feed").select("id, actor_id, verb, object_type, object_id, meta, created_at, profiles(id, display_name, avatar_url)").in("actor_id", friendIds).in("object_type", ["event", "venue"]).order("created_at", { ascending: false }).limit(Math.min(Math.max(limit, 1), 100));
  return (data ?? []).flatMap((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    if (!profile || (row.object_type !== "event" && row.object_type !== "venue")) return [];
    return [{ id: row.id, actor: profile as PublicSocialProfile, verb: row.verb, object_type: row.object_type, object_id: row.object_id, meta: (row.meta ?? {}) as Record<string, unknown>, created_at: row.created_at }];
  });
}
