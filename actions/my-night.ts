"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { MAX_NIGHT_STOPS, mergeStops, type MyNightRefInput } from "@/lib/my-night/logic";
import { todayYmdInTz } from "@/lib/event-dates";
import { isUuid } from "@/lib/utils";
import type { MyNightStopKind } from "@/types";

type ActionResult = { ok: boolean; error?: string; token?: string };

function isKind(value: unknown): value is MyNightStopKind {
  return value === "venue" || value === "event";
}

async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/** Validate that a venue/event reference actually exists (server-side). */
async function refExists(kind: MyNightStopKind, refId: string): Promise<boolean> {
  if (!isUuid(refId)) return false;
  const admin = createAdminClient();
  const table = kind === "venue" ? "venues" : "events";
  const { data } = await admin.from(table).select("id").eq("id", refId).maybeSingle();
  return Boolean(data);
}

async function getOrCreateActivePlan(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: existing } = await supabase
    .from("night_plans")
    .select("id, title")
    .eq("user_id", userId)
    .is("share_token", null)
    .maybeSingle();
  if (existing) return existing;
  const { data: created, error } = await supabase
    .from("night_plans")
    .insert({ user_id: userId, title: "My Night", plan_date: todayYmdInTz() })
    .select("id, title")
    .single();
  if (error || !created) return null;
  return created;
}

async function loadStopRefs(supabase: Awaited<ReturnType<typeof createClient>>, planId: string) {
  const { data } = await supabase
    .from("night_plan_stops")
    .select("id, position, venue_id, event_id")
    .eq("plan_id", planId)
    .order("position", { ascending: true });
  return (data ?? []).map((row) => ({
    stopId: row.id as string,
    kind: (row.event_id ? "event" : "venue") as MyNightStopKind,
    refId: (row.event_id ?? row.venue_id ?? "") as string,
  }));
}

export async function addStopToNight(kindRaw: FormDataEntryValue | null, refIdRaw: FormDataEntryValue | null): Promise<ActionResult> {
  const { supabase, user } = await getCurrentUser();
  if (!user) return { ok: false, error: "login" };
  const kind = String(kindRaw ?? "");
  if (!isKind(kind) || !isUuid(String(refIdRaw ?? ""))) return { ok: false, error: "invalid" };
  const refId = String(refIdRaw);
  if (!(await refExists(kind, refId))) return { ok: false, error: "invalid" };

  const plan = await getOrCreateActivePlan(supabase, user.id);
  if (!plan) return { ok: false, error: "storage" };

  const existing = await loadStopRefs(supabase, plan.id);
  if (existing.length >= MAX_NIGHT_STOPS) return { ok: false, error: "limit" };
  if (existing.some((s) => s.kind === kind && s.refId === refId)) return { ok: false, error: "duplicate" };

  const { error } = await supabase.from("night_plan_stops").insert({
    plan_id: plan.id,
    position: existing.length,
    venue_id: kind === "venue" ? refId : null,
    event_id: kind === "event" ? refId : null,
  });
  if (error) return { ok: false, error: "storage" };

  revalidatePath("/my-night");
  return { ok: true };
}

export async function removeStopFromNight(stopIdRaw: FormDataEntryValue | null): Promise<ActionResult> {
  const { supabase, user } = await getCurrentUser();
  if (!user) return { ok: false, error: "login" };
  const stopId = String(stopIdRaw ?? "");
  if (!isUuid(stopId)) return { ok: false, error: "invalid" };

  const { error } = await supabase.from("night_plan_stops").delete().eq("id", stopId);
  if (error) return { ok: false, error: "storage" };

  revalidatePath("/my-night");
  return { ok: true };
}

export async function reorderNightStops(orderedStopIdsRaw: FormDataEntryValue[] | FormDataEntryValue | null): Promise<ActionResult> {
  const { supabase, user } = await getCurrentUser();
  if (!user) return { ok: false, error: "login" };

  const raw = Array.isArray(orderedStopIdsRaw)
    ? orderedStopIdsRaw
    : orderedStopIdsRaw
      ? [orderedStopIdsRaw]
      : [];
  const ordered = raw.map(String).filter((id) => isUuid(id));
  if (!ordered.length || ordered.length > MAX_NIGHT_STOPS) return { ok: false, error: "invalid" };

  const { data: plan } = await supabase
    .from("night_plans")
    .select("id")
    .eq("user_id", user.id)
    .is("share_token", null)
    .maybeSingle();
  if (!plan) return { ok: false, error: "empty" };

  const existing = await loadStopRefs(supabase, plan.id);
  if (existing.length !== ordered.length) return { ok: false, error: "invalid" };
  const existingIds = new Set(existing.map((s) => s.stopId));
  if (ordered.some((id) => !existingIds.has(id))) return { ok: false, error: "invalid" };

  for (let i = 0; i < ordered.length; i++) {
    const { error } = await supabase
      .from("night_plan_stops")
      .update({ position: i })
      .eq("id", ordered[i]);
    if (error) return { ok: false, error: "storage" };
  }

  revalidatePath("/my-night");
  return { ok: true };
}

export async function renameNightPlan(titleRaw: FormDataEntryValue | null): Promise<ActionResult> {
  const { supabase, user } = await getCurrentUser();
  if (!user) return { ok: false, error: "login" };
  const title = String(titleRaw ?? "").trim().slice(0, 40);
  if (!title) return { ok: false, error: "invalid" };

  const { error } = await supabase
    .from("night_plans")
    .update({ title, updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("share_token", null);
  if (error) return { ok: false, error: "storage" };

  revalidatePath("/my-night");
  return { ok: true };
}

export async function clearMyNight(): Promise<ActionResult> {
  const { supabase, user } = await getCurrentUser();
  if (!user) return { ok: false, error: "login" };

  const { error } = await supabase
    .from("night_plans")
    .delete()
    .eq("user_id", user.id)
    .is("share_token", null);
  if (error) return { ok: false, error: "storage" };

  revalidatePath("/my-night");
  return { ok: true };
}

export async function shareMyNight(): Promise<ActionResult> {
  const { supabase, user } = await getCurrentUser();
  if (!user) return { ok: false, error: "login" };

  const { data: plan } = await supabase
    .from("night_plans")
    .select("id, title")
    .eq("user_id", user.id)
    .is("share_token", null)
    .maybeSingle();
  if (!plan) return { ok: false, error: "empty" };

  const stops = await loadStopRefs(supabase, plan.id);
  if (!stops.length) return { ok: false, error: "empty" };

  const token = randomBytes(9).toString("hex");
  let title = plan.title;
  if (title === "My Night") {
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();
    const name = profile?.display_name;
    if (typeof name === "string" && name.trim()) title = `${name.trim()}'s My Night`;
  }

  const { data: snapshot, error } = await supabase
    .from("night_plans")
    .insert({
      user_id: user.id,
      title,
      share_token: token,
      plan_date: todayYmdInTz(),
    })
    .select("id")
    .single();
  if (error || !snapshot) return { ok: false, error: "storage" };

  const { error: stopsError } = await supabase.from("night_plan_stops").insert(
    stops.map((s, i) => ({
      plan_id: snapshot.id,
      position: i,
      venue_id: s.kind === "venue" ? s.refId : null,
      event_id: s.kind === "event" ? s.refId : null,
    })),
  );
  if (stopsError) return { ok: false, error: "storage" };

  revalidatePath("/my-night");
  return { ok: true, token };
}

/** Guest → account merge: bring the local plan into the user's active plan. */
export async function mergeLocalNightStops(stopsRaw: MyNightRefInput[]): Promise<ActionResult> {
  const { supabase, user } = await getCurrentUser();
  if (!user) return { ok: false, error: "login" };

  const incoming = (Array.isArray(stopsRaw) ? stopsRaw : [])
    .filter((s): s is MyNightRefInput => Boolean(s && isKind(s.kind) && typeof s.refId === "string" && s.refId))
    .slice(0, MAX_NIGHT_STOPS);
  if (!incoming.length) return { ok: true };

  // Validate references server-side.
  const validated: MyNightRefInput[] = [];
  for (const stop of incoming) {
    if (await refExists(stop.kind, stop.refId)) validated.push(stop);
  }
  if (!validated.length) return { ok: true };

  const plan = await getOrCreateActivePlan(supabase, user.id);
  if (!plan) return { ok: false, error: "storage" };

  const existing = await loadStopRefs(supabase, plan.id);
  const merged = mergeStops(
    existing.map((s) => ({ kind: s.kind, refId: s.refId })),
    validated,
  );

  const { error: clearError } = await supabase.from("night_plan_stops").delete().eq("plan_id", plan.id);
  if (clearError) return { ok: false, error: "storage" };

  const { error: insertError } = await supabase.from("night_plan_stops").insert(
    merged.map((s, i) => ({
      plan_id: plan.id,
      position: i,
      venue_id: s.kind === "venue" ? s.refId : null,
      event_id: s.kind === "event" ? s.refId : null,
    })),
  );
  if (insertError) return { ok: false, error: "storage" };

  revalidatePath("/my-night");
  return { ok: true };
}
