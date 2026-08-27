import { mapVenueRow } from "@/lib/mappers/supabase";
import { getPublicSupabase } from "@/lib/supabase/public-server";
import type { Venue } from "@/types";

const venueSelect =
  "id, slug, name, city_slug, category, address, lat, lng, image_url, price_level, atmosphere_score, crowd_count, is_live, is_featured, is_trending, description, gallery_urls, music_genres, social_links, website_url, contact_email, contact_phone, capacity";
const venueSelectWithDayParts = `${venueSelect}, day_parts, places_types`;

export async function getVenues(): Promise<Venue[]> {
  return getVenuesForCity("prishtina");
}

export async function getVenuesForCity(citySlug?: string): Promise<Venue[]> {
  try {
    const supabase = getPublicSupabase();
    if (!supabase) return [];

    // Prefer day_parts (Places data). Falls back to the base columns when the
    // venues.day_parts migration hasn't been applied to this environment yet.
    const [rows, err] = await trySelect(supabase, venueSelectWithDayParts, citySlug);
    if (err) {
      if (!/day_parts/.test(err)) {
        console.error("[neya] getVenues", err);
        return [];
      }
      const [base] = await trySelect(supabase, venueSelect, citySlug);
      return base?.map((row) => mapVenueRow(row)) ?? [];
    }

    return rows?.map((row) => mapVenueRow(row)) ?? [];
  } catch (e) {
    console.error("[neya] getVenues", e);
    return [];
  }
}

export async function getVenueBySlug(slug: string): Promise<Venue | null> {
  try {
    const supabase = getPublicSupabase();
    if (!supabase) return null;

    const [row, err] = await trySelectOne(supabase, venueSelectWithDayParts, slug);
    if (err && /day_parts/.test(err)) {
      const [base] = await trySelectOne(supabase, venueSelect, slug);
      return base ? mapVenueRow(base) : null;
    }
    if (err) {
      console.error("[neya] getVenueBySlug", err);
      return null;
    }
    return row ? mapVenueRow(row) : null;
  } catch (e) {
    console.error("[neya] getVenueBySlug", e);
    return null;
  }
}

type VenueRow = Parameters<typeof mapVenueRow>[0];

async function trySelect(
  supabase: NonNullable<ReturnType<typeof getPublicSupabase>>,
  select: string,
  citySlug?: string,
): Promise<[VenueRow[] | null, string | null]> {
  let request = supabase
    .from("venues")
    .select(select)
    .eq("approved", true)
    .eq("rejected", false)
    .order("is_trending", { ascending: false })
    .order("name", { ascending: true });
  if (citySlug) request = request.eq("city_slug", citySlug);
  const { data, error } = await request;
  return [data as VenueRow[] | null, error?.message ?? null];
}

async function trySelectOne(
  supabase: NonNullable<ReturnType<typeof getPublicSupabase>>,
  select: string,
  slug: string,
): Promise<[VenueRow | null, string | null]> {
  const { data, error } = await supabase
    .from("venues")
    .select(select)
    .eq("slug", slug)
    .eq("approved", true)
    .eq("rejected", false)
    .maybeSingle();
  return [data as VenueRow | null, error?.message ?? null];
}