import { MOCK_VENUES } from "@/data/mock-data";
import { mapVenueRow } from "@/lib/mappers/supabase";
import { getPublicSupabase } from "@/lib/supabase/public-server";
import type { Venue } from "@/types";

export async function getVenues(): Promise<Venue[]> {
  try {
    const supabase = getPublicSupabase();
    if (!supabase) return MOCK_VENUES;

    const { data, error } = await supabase
      .from("venues")
      .select(
        "id, slug, name, city_slug, category, address, lat, lng, image_url, price_level, atmosphere_score, crowd_count, is_live",
      )
      .eq("city_slug", "prishtina")
      .order("name", { ascending: true });

    if (error) {
      console.error("[neya] getVenues", error.message);
      return MOCK_VENUES;
    }

    const mapped = data?.map((row) => mapVenueRow(row)) ?? [];
    return mapped.length ? mapped : MOCK_VENUES;
  } catch (e) {
    console.error("[neya] getVenues", e);
    return MOCK_VENUES;
  }
}

export async function getVenueBySlug(slug: string): Promise<Venue | null> {
  try {
    const supabase = getPublicSupabase();
    if (!supabase) return MOCK_VENUES.find((v) => v.slug === slug) ?? null;

    const { data, error } = await supabase
      .from("venues")
      .select(
        "id, slug, name, city_slug, category, address, lat, lng, image_url, price_level, atmosphere_score, crowd_count, is_live",
      )
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      console.error("[neya] getVenueBySlug", error.message);
      return MOCK_VENUES.find((v) => v.slug === slug) ?? null;
    }
    if (!data) return MOCK_VENUES.find((v) => v.slug === slug) ?? null;
    return mapVenueRow(data);
  } catch (e) {
    console.error("[neya] getVenueBySlug", e);
    return MOCK_VENUES.find((v) => v.slug === slug) ?? null;
  }
}
