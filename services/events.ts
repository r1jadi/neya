import type { SupabaseClient } from "@supabase/supabase-js";
import { MOCK_EVENTS } from "@/data/mock-data";
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
        venues!inner (
          id,
          slug,
          name,
          image_url,
          price_level,
          category
        )
      `;

function clientOrPublic(client?: SupabaseClient | null): SupabaseClient | null {
  return client ?? getPublicSupabase();
}

export async function getFeaturedEvents(client?: SupabaseClient | null): Promise<Event[]> {
  try {
    const supabase = clientOrPublic(client);
    if (!supabase) return MOCK_EVENTS;

    const { data, error } = await supabase
      .from("events")
      .select(eventSelect)
      .order("starts_at", { ascending: true })
      .limit(80);

    if (error) {
      console.error("[neya] getFeaturedEvents", error.message);
      return client ? [] : MOCK_EVENTS;
    }

    const mapped =
      data?.map((row) => mapEventRow(row as Parameters<typeof mapEventRow>[0])).filter((e): e is Event => e !== null) ??
      [];

    if (mapped.length) return mapped;
    return client ? [] : MOCK_EVENTS;
  } catch (e) {
    console.error("[neya] getFeaturedEvents", e);
    return client ? [] : MOCK_EVENTS;
  }
}

export async function getEventBySlug(slug: string, client?: SupabaseClient | null): Promise<Event | null> {
  try {
    const supabase = clientOrPublic(client);
    if (!supabase) return MOCK_EVENTS.find((e) => e.slug === slug) ?? null;

    const { data, error } = await supabase.from("events").select(eventSelect).eq("slug", slug).maybeSingle();

    if (error) {
      console.error("[neya] getEventBySlug", error.message);
      return client ? null : MOCK_EVENTS.find((e) => e.slug === slug) ?? null;
    }
    if (!data) return client ? null : MOCK_EVENTS.find((e) => e.slug === slug) ?? null;
    return mapEventRow(data as Parameters<typeof mapEventRow>[0]);
  } catch (e) {
    console.error("[neya] getEventBySlug", e);
    return client ? null : MOCK_EVENTS.find((e) => e.slug === slug) ?? null;
  }
}
