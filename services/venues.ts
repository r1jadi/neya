import { mapVenueRow } from "@/lib/mappers/supabase";
import { getPublicSupabase } from "@/lib/supabase/public-server";
import type { Venue } from "@/types";

const venueSelect =
  "id, slug, name, city_slug, category, address, lat, lng, image_url, price_level, atmosphere_score, crowd_count, is_live, is_featured, is_trending, description, capacity, website, social_links, gallery_urls, music_genres, contact_email, contact_phone";

export async function getVenues(): Promise<Venue[]> {
  try {
    const supabase = getPublicSupabase();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from("venues")
      .select(venueSelect)
      .eq("city_slug", "prishtina")
      .eq("approved", true)
      .eq("rejected", false)
      .order("is_trending", { ascending: false })
      .order("name", { ascending: true });

    if (error) {
      console.error("[neya] getVenues", error.message);
      return [];
    }

    return data?.map((row) => mapVenueRow(row)) ?? [];
  } catch (e) {
    console.error("[neya] getVenues", e);
    return [];
  }
}

export async function getVenueBySlug(slug: string): Promise<Venue | null> {
  try {
    const supabase = getPublicSupabase();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from("venues")
      .select(venueSelect)
      .eq("slug", slug)
      .eq("approved", true)
      .eq("rejected", false)
      .maybeSingle();

    if (error) {
      console.error("[neya] getVenueBySlug", error.message);
      return null;
    }
    if (!data) return null;
    return mapVenueRow(data);
  } catch (e) {
    console.error("[neya] getVenueBySlug", e);
    return null;
  }
}
