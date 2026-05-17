import { resolveImageUrl } from "@/lib/images";
import { getPublicSupabase } from "@/lib/supabase/public-server";
import type { StoryItem } from "@/types";

export async function getStoriesForCity(citySlug = "prishtina"): Promise<StoryItem[]> {
  try {
    const sb = getPublicSupabase();
    if (!sb) return [];

    const iso = new Date().toISOString();
    const { data, error } = await sb
      .from("stories")
      .select(
        `
        id,
        media_url,
        venues!inner (
          slug,
          name,
          image_url,
          city_slug,
          approved
        )
      `,
      )
      .eq("venues.city_slug", citySlug)
      .eq("venues.approved", true)
      .or(`expires_at.is.null,expires_at.gt.${iso}`)
      .order("created_at", { ascending: false })
      .limit(24);

    if (error) {
      console.error("[neya] getStoriesForCity", error.message);
      return [];
    }

    const mapped: StoryItem[] =
      data?.map((row) => {
        const raw = row.venues as
          | { slug: string; name: string; image_url?: string | null }
          | { slug: string; name: string; image_url?: string | null }[]
          | null;
        const v = Array.isArray(raw) ? raw[0] : raw;
        if (!v) {
          return {
            id: row.id,
            venue_slug: "unknown",
            venue_name: "Venue",
            thumbnail_url: resolveImageUrl(row.media_url),
            label: "Live",
          };
        }
        return {
          id: row.id,
          venue_slug: v.slug,
          venue_name: v.name,
          thumbnail_url: resolveImageUrl(row.media_url || v.image_url),
          label: "Live",
        };
      }) ?? [];

    return mapped;
  } catch (e) {
    console.error("[neya] getStoriesForCity", e);
    return [];
  }
}
