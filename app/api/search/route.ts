import { NextResponse } from "next/server";
import { getPublicSupabase } from "@/lib/supabase/public-server";
import { formatEventWhen } from "@/lib/event-dates";

export const dynamic = "force-dynamic";

const MAX_QUERY = 60;

export type SearchGroup = "events" | "venues" | "guides";

export interface SearchResultItem {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  image?: string | null;
  meta?: string | null;
  href: string;
}

export interface SearchResponse {
  query: string;
  groups: Partial<Record<SearchGroup, SearchResultItem[]>>;
  total: number;
}

/**
 * Global discovery search — Events, Venues and Guides in one grouped result.
 * Only real, published/approved records are ever returned.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = url.searchParams.get("q")?.trim().slice(0, MAX_QUERY) ?? "";
  const query = raw.toLowerCase();
  const supabase = getPublicSupabase();

  if (!supabase) {
    return NextResponse.json({ error: "Search unavailable" }, { status: 503 });
  }
  if (!query) {
    return NextResponse.json({ query: raw, groups: {}, total: 0 } satisfies SearchResponse);
  }

  const [events, venues, guides] = await Promise.all([
    searchEvents(supabase, query),
    searchVenues(supabase, query),
    searchGuides(supabase, query),
  ]);

  const groups = { events, venues, guides };
  const total = events.length + venues.length + guides.length;

  return NextResponse.json({ query: raw, groups, total } satisfies SearchResponse);
}

async function searchEvents(
  supabase: NonNullable<ReturnType<typeof getPublicSupabase>>,
  query: string,
): Promise<SearchResultItem[]> {
  try {
    const { data } = await supabase
      .from("events")
      .select(
        `id, slug, title, starts_at, image_url, genre, category, is_free,
         venues (id, slug, name, address, city_slug)`,
      )
      .eq("is_listed_public", true)
      .in("submission_status", ["approved", "published"])
      .gte("starts_at", new Date().toISOString())
      .or(`title.ilike.%${query}%,genre.ilike.%${query}%,venues.name.ilike.%${query}%`)
      .order("starts_at", { ascending: true })
      .limit(6);

    return (data ?? [])
      .map((row) => {
        const venue = Array.isArray(row.venues) ? row.venues[0] : row.venues;
        return {
          id: row.id,
          slug: row.slug,
          title: row.title,
          subtitle: venue?.name ?? null,
          image: row.image_url || null,
          meta: formatEventWhen(row.starts_at),
          href: `/events/${row.slug}`,
        } satisfies SearchResultItem;
      });
  } catch (error) {
    console.error("[neya] search events:", error);
    return [];
  }
}

async function searchVenues(
  supabase: NonNullable<ReturnType<typeof getPublicSupabase>>,
  query: string,
): Promise<SearchResultItem[]> {
  try {
    const { data } = await supabase
      .from("venues")
      .select("id, slug, name, category, address, image_url, price_level, city_slug")
      .eq("approved", true)
      .eq("rejected", false)
      .or(`name.ilike.%${query}%,category.ilike.%${query}%,address.ilike.%${query}%`)
      .order("is_trending", { ascending: false })
      .limit(4);

    return (data ?? []).map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.name,
      subtitle: [row.category, row.address].filter(Boolean).join(" · ") || null,
      image: row.image_url || null,
      meta: null,
      href: `/venues/${row.slug}`,
    } satisfies SearchResultItem));
  } catch (error) {
    console.error("[neya] search venues:", error);
    return [];
  }
}

async function searchGuides(
  supabase: NonNullable<ReturnType<typeof getPublicSupabase>>,
  query: string,
): Promise<SearchResultItem[]> {
  try {
    const { data } = await supabase
      .from("guides")
      .select("id, slug, title, description, cover_image, categories, duration_days, price")
      .eq("published", true)
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .order("featured", { ascending: false })
      .limit(4);

    return (data ?? []).map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      subtitle: row.description ?? null,
      image: row.cover_image || null,
      meta: row.price > 0 ? `€${row.price}` : "Free",
      href: `/guides/${row.slug}`,
    } satisfies SearchResultItem));
  } catch (error) {
    console.error("[neya] search guides:", error);
    return [];
  }
}

