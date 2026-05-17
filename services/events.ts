import type { SupabaseClient } from "@supabase/supabase-js";
import { mapEventRow } from "@/lib/mappers/supabase";
import { getPublicSupabase } from "@/lib/supabase/public-server";
import type { Event } from "@/types";

const eventSelect = `
        id,
        slug,
        title,
        starts_at,
        ends_at,
        genre,
        image_url,
        crowd_count,
        atmosphere_rating,
        live_status,
        fomo_line,
        reservation_spots_left,
        ticket_from_eur,
        is_hidden_premium,
        is_listed_public,
        is_featured,
        venues!inner (
          id,
          slug,
          name,
          image_url,
          price_level,
          category,
          approved
        )
      `;

function clientOrPublic(client?: SupabaseClient | null): SupabaseClient | null {
  return client ?? getPublicSupabase();
}

export async function getFeaturedEvents(client?: SupabaseClient | null): Promise<Event[]> {
  try {
    const supabase = clientOrPublic(client);
    if (!supabase) return [];

    const { data, error } = await supabase
      .from("events")
      .select(eventSelect)
      .eq("is_listed_public", true)
      .order("is_featured", { ascending: false })
      .order("starts_at", { ascending: true })
      .limit(80);

    if (error) {
      console.error("[neya] getFeaturedEvents", error.message);
      return [];
    }

    return (
      data
        ?.map((row) => mapEventRow(row as Parameters<typeof mapEventRow>[0]))
        .filter((e): e is Event => e !== null) ?? []
    );
  } catch (e) {
    console.error("[neya] getFeaturedEvents", e);
    return [];
  }
}

export async function getEventBySlug(slug: string, client?: SupabaseClient | null): Promise<Event | null> {
  try {
    const supabase = clientOrPublic(client);
    if (!supabase) return null;

    const { data, error } = await supabase.from("events").select(eventSelect).eq("slug", slug).maybeSingle();

    if (error) {
      console.error("[neya] getEventBySlug", error.message);
      return null;
    }
    if (!data) return null;
    return mapEventRow(data as Parameters<typeof mapEventRow>[0]);
  } catch (e) {
    console.error("[neya] getEventBySlug", e);
    return null;
  }
}
