"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/utils";

type Result = { ok: boolean; error?: string };

async function current() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  return { client, user };
}

export async function sendFriendRequest(targetId: string): Promise<Result> {
  const { client, user } = await current();
  if (!user) return { ok: false, error: "login" };
  if (!isUuid(targetId) || targetId === user.id) return { ok: false, error: "invalid" };
  const { data: existing } = await client.from("friendships").select("id, requester_id, addressee_id, status").or(`and(requester_id.eq.${user.id},addressee_id.eq.${targetId}),and(requester_id.eq.${targetId},addressee_id.eq.${user.id})`).maybeSingle();
  if (existing) return { ok: false, error: existing.status === "accepted" ? "already_friends" : "duplicate" };
  const { error } = await client.from("friendships").insert({ requester_id: user.id, addressee_id: targetId, status: "pending" });
  if (error) return { ok: false, error: "storage" };
  revalidatePath("/friends");
  return { ok: true };
}

export async function respondToFriendRequest(friendshipId: string, action: "accept" | "decline"): Promise<Result> {
  const { client, user } = await current();
  if (!user || !isUuid(friendshipId)) return { ok: false, error: user ? "invalid" : "login" };
  const { data: request } = await client.from("friendships").select("id, addressee_id, status").eq("id", friendshipId).maybeSingle();
  if (!request || request.addressee_id !== user.id || request.status !== "pending") return { ok: false, error: "forbidden" };
  const result = action === "accept"
    ? await client.from("friendships").update({ status: "accepted" }).eq("id", friendshipId).eq("addressee_id", user.id)
    : await client.from("friendships").delete().eq("id", friendshipId).eq("addressee_id", user.id);
  if (result.error) return { ok: false, error: "storage" };
  revalidatePath("/friends");
  return { ok: true };
}

export async function createGroupNightInvite(planId: string, inviteeId: string): Promise<Result> {
  const { client, user } = await current();
  if (!user) return { ok: false, error: "login" };
  if (!isUuid(planId) || !isUuid(inviteeId) || user.id === inviteeId) return { ok: false, error: "invalid" };
  const { data: friendship } = await client.from("friendships").select("id").eq("status", "accepted").or(`and(requester_id.eq.${user.id},addressee_id.eq.${inviteeId}),and(requester_id.eq.${inviteeId},addressee_id.eq.${user.id})`).maybeSingle();
  if (!friendship) return { ok: false, error: "forbidden" };
  const { data: plan } = await client.from("night_plans").select("id").eq("id", planId).eq("user_id", user.id).is("share_token", null).maybeSingle();
  if (!plan) return { ok: false, error: "forbidden" };
  const { error } = await client.from("group_night_invites").insert({ plan_id: planId, inviter_id: user.id, invitee_id: inviteeId });
  if (error) return { ok: false, error: error.code === "23505" ? "duplicate" : "storage" };
  revalidatePath("/friends");
  return { ok: true };
}

export async function respondToGroupNightInvite(inviteId: string, action: "accept" | "decline"): Promise<Result> {
  const { client, user } = await current();
  if (!user || !isUuid(inviteId)) return { ok: false, error: user ? "invalid" : "login" };
  const { data: invite } = await client.from("group_night_invites").select("id, invitee_id, status, expires_at").eq("id", inviteId).maybeSingle();
  if (!invite || invite.invitee_id !== user.id || invite.status !== "pending") return { ok: false, error: "forbidden" };
  if (new Date(invite.expires_at).getTime() <= Date.now()) return { ok: false, error: "expired" };
  const { error } = await client.from("group_night_invites").update({ status: action === "accept" ? "accepted" : "declined", updated_at: new Date().toISOString() }).eq("id", inviteId).eq("invitee_id", user.id).eq("status", "pending");
  if (error) return { ok: false, error: "storage" };
  revalidatePath("/friends");
  return { ok: true };
}

export async function removeFriend(friendshipId: string): Promise<Result> {
  const { client, user } = await current();
  if (!user || !isUuid(friendshipId)) return { ok: false, error: user ? "invalid" : "login" };
  const { error } = await client.from("friendships").delete().eq("id", friendshipId).or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
  if (error) return { ok: false, error: "storage" };
  revalidatePath("/friends");
  return { ok: true };
}
