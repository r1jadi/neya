import type { SupabaseClient } from "@supabase/supabase-js";
import { getPublicSupabase } from "@/lib/supabase/public-server";

export type EventSource = { id: string; source_type: "official_organizer" | "official_venue" | "official_website" | "official_instagram" | "ticketing_provider" | "other"; label: string | null; url: string; is_verified: boolean; verified_at: string | null; verification_note: string | null };
export async function getEventSources(eventId: string, client?: SupabaseClient | null): Promise<EventSource[]> {
  const supabase = client ?? getPublicSupabase(); if (!supabase) return [];
  const { data, error } = await supabase.from("event_sources").select("id, source_type, label, url, is_verified, verified_at, verification_note").eq("event_id", eventId).order("is_verified", { ascending: false }).order("created_at");
  if (error) { console.error("[neya] getEventSources", error.message); return []; } return (data ?? []) as EventSource[];
}
