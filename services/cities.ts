import { getPublicSupabase } from "@/lib/supabase/public-server";

export type City = { slug: string; name: string; country_slug: string; country_name: string; region_slug: string; region_name: string; latitude: number | null; longitude: number | null };

const select = "slug, name, country_slug, country_name, region_slug, region_name, latitude, longitude";

export async function getActiveCities(): Promise<City[]> {
  const supabase = getPublicSupabase(); if (!supabase) return [];
  const { data, error } = await supabase.from("cities").select(select).eq("is_active", true).order("region_name").order("country_name").order("name");
  if (error) { console.error("[neya] getActiveCities", error.message); return []; }
  return (data ?? []) as City[];
}

export async function getCity(slug: string): Promise<City | null> {
  const supabase = getPublicSupabase(); if (!supabase) return null;
  const { data, error } = await supabase.from("cities").select(select).eq("slug", slug).eq("is_active", true).maybeSingle();
  if (error) { console.error("[neya] getCity", error.message); return null; }
  return data as City | null;
}
