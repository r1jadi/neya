import { MOCK_EVENTS } from "@/data/mock-data";
import { mapEventRow } from "@/lib/mappers/supabase";
import { getPublicSupabase } from "@/lib/supabase/public-server";
import type { Event } from "@/types";

export async function getFeaturedEvents(): Promise<Event[]> {
  try {
    const supabase = getPublicSupabase();
    if (!supabase) return MOCK_EVENTS;

    const { data, error } = await supabase
      .from("events")
      .select(
        `
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
        venues!inner (
          id,
          slug,
          name,
          image_url,
          price_level,
          category
        )
      `,
      )
      .order("starts_at", { ascending: true })
      .limit(60);

    if (error) {
      console.error("[neya] getFeaturedEvents", error.message);
      return MOCK_EVENTS;
    }

    const mapped =
      data?.map((row) => mapEventRow(row as Parameters<typeof mapEventRow>[0])).filter((e): e is Event => e !== null) ??
      [];

    return mapped.length ? mapped : MOCK_EVENTS;
  } catch (e) {
    console.error("[neya] getFeaturedEvents", e);
    return MOCK_EVENTS;
  }
}

export async function getEventBySlug(slug: string): Promise<Event | null> {
  try {
    const supabase = getPublicSupabase();
    if (!supabase) return MOCK_EVENTS.find((e) => e.slug === slug) ?? null;

    const { data, error } = await supabase
      .from("events")
      .select(
        `
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
        venues!inner (
          id,
          slug,
          name,
          image_url,
          price_level,
          category
        )
      `,
      )
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      console.error("[neya] getEventBySlug", error.message);
      return MOCK_EVENTS.find((e) => e.slug === slug) ?? null;
    }
    if (!data) return MOCK_EVENTS.find((e) => e.slug === slug) ?? null;
    return mapEventRow(data as Parameters<typeof mapEventRow>[0]);
  } catch (e) {
    console.error("[neya] getEventBySlug", e);
    return MOCK_EVENTS.find((e) => e.slug === slug) ?? null;
  }
}
