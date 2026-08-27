import { resolveImageUrl } from "@/lib/images";
import { MUSIC_GENRES, VENUE_CATEGORIES, type Event, type EventPerformer, type MusicGenre, type Venue, type VenueCategory } from "@/types";

const LEGACY_GENRES: Record<string, MusicGenre> = {
  afro: "afro_house",
  "hip-hop": "hip_hop",
  "r&b": "r_and_b",
  live: "live_music",
  mixed: "other",
};

function normalizeGenre(g: string | null | undefined): MusicGenre {
  const raw = (g ?? "other").toLowerCase().trim().replace(/[\s-]+/g, "_");
  if (raw === "r_b") return "r_and_b";
  return MUSIC_GENRES.some((genre) => genre.id === raw)
    ? raw as MusicGenre
    : LEGACY_GENRES[g?.toLowerCase() ?? ""] ?? "other";
}

const CATEGORIES: VenueCategory[] = ["club", ...VENUE_CATEGORIES.map((category) => category.id)];

function normalizeCategory(c: string | null | undefined): VenueCategory {
  const x = (c ?? "club").toLowerCase() as VenueCategory;
  return CATEGORIES.includes(x) ? x : "club";
}

function num(n: unknown, fallback: number): number {
  if (typeof n === "number" && !Number.isNaN(n)) return n;
  if (typeof n === "string") {
    const p = parseFloat(n);
    if (!Number.isNaN(p)) return p;
  }
  return fallback;
}

function mapPerformers(value: unknown): EventPerformer[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const performers = value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const name = typeof row.name === "string" ? row.name.trim().slice(0, 160) : "";
    if (!name) return [];
    const social = row.social_links;
    const social_links = social && typeof social === "object" && !Array.isArray(social)
      ? Object.fromEntries(Object.entries(social).filter(([key, url]) => typeof key === "string" && typeof url === "string" && url.trim()).map(([key, url]) => [key.slice(0, 40), (url as string).trim().slice(0, 2000)]))
      : undefined;
    return [{ name, image_url: typeof row.image_url === "string" && row.image_url.trim() ? row.image_url.trim().slice(0, 2000) : undefined, genre: typeof row.genre === "string" && row.genre.trim() ? row.genre.trim().slice(0, 80) : undefined, social_links }];
  });
  return performers.length ? performers : undefined;
}

export function mapVenueRow(row: {
  id: string;
  slug: string;
  name: string;
  city_slug?: string | null;
  category?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  image_url?: string | null;
  price_level?: number | null;
  atmosphere_score?: number | string | null;
  crowd_count?: number | null;
  is_live?: boolean | null;
  is_featured?: boolean | null;
  is_trending?: boolean | null;
  description?: string | null;
  gallery_urls?: string[] | null;
  music_genres?: string[] | null;
  social_links?: Record<string, string> | null;
  website_url?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  capacity?: number | null;
  day_parts?: string[] | null;
  places_types?: string[] | null;
}): Venue {
  const price = Math.min(4, Math.max(1, Math.round(num(row.price_level, 2)))) as Venue["price_level"];
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    city_slug: row.city_slug ?? "prishtina",
    category: normalizeCategory(row.category ?? undefined),
    address: row.address ?? undefined,
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
    image_url: resolveImageUrl(row.image_url),
    price_level: price,
    atmosphere_score: row.atmosphere_score != null ? num(row.atmosphere_score, 8) : undefined,
    crowd_count: row.crowd_count ?? undefined,
    is_live: row.is_live ?? undefined,
    is_featured: row.is_featured ?? undefined,
    is_trending: row.is_trending ?? undefined,
    description: row.description?.trim() || undefined,
    gallery_urls: Array.isArray(row.gallery_urls) ? row.gallery_urls.map((url) => url.trim()).filter(Boolean) : undefined,
    music_genres: Array.isArray(row.music_genres) ? row.music_genres.map((genre) => genre.trim()).filter(Boolean) : undefined,
    social_links: row.social_links ?? undefined,
    website_url: row.website_url?.trim() || undefined,
    contact_email: row.contact_email?.trim() || undefined,
    contact_phone: row.contact_phone?.trim() || undefined,
    capacity: row.capacity ?? undefined,
    day_parts: Array.isArray(row.day_parts)
      ? row.day_parts
          .map((d) => (typeof d === "string" ? d.trim() : ""))
          .filter(Boolean)
      : undefined,
    places_types: Array.isArray(row.places_types)
      ? row.places_types
          .map((t) => (typeof t === "string" ? t.trim() : ""))
          .filter(Boolean)
      : undefined,
  };
}

export function mapEventRow(row: {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  venue_name?: string | null;
  starts_at: string;
  ends_at?: string | null;
  genre?: string | null;
  image_url?: string | null;
  dj_lineup?: string[] | null;
  performers?: unknown;
  capacity?: number | null;
  ticket_url?: string | null;
  crowd_count?: number | null;
  atmosphere_rating?: number | string | null;
  live_status?: boolean | null;
  fomo_line?: string | null;
  reservation_spots_left?: number | null;
  ticket_from_eur?: number | string | null;
  is_hidden_premium?: boolean | null;
  is_listed_public?: boolean | null;
  is_featured?: boolean | null;
  city_slug?: string | null;
  category?: string | null;
  tags?: string[] | null;
  is_free?: boolean | null;
  tickets?: Array<{
    status?: "available" | "sold_out" | "closed" | null;
    quantity_total?: number | null;
    quantity_sold?: number | null;
    quantity_reserved?: number | null;
    sales_start?: string | null;
    sales_end?: string | null;
  }> | null;
  venues:
    | {
        id: string;
        slug: string;
        name: string;
        image_url?: string | null;
        price_level?: number | null;
        category?: string | null;
        address?: string | null;
        city_slug?: string | null;
        lat?: number | null;
        lng?: number | null;
        is_trending?: boolean | null;
        approved?: boolean | null;
        capacity?: number | null;
      }
    | Array<{
        id: string;
        slug: string;
        name: string;
        image_url?: string | null;
        price_level?: number | null;
        category?: string | null;
        address?: string | null;
        city_slug?: string | null;
        lat?: number | null;
        lng?: number | null;
        is_trending?: boolean | null;
        approved?: boolean | null;
        capacity?: number | null;
      }>
    | null;
}): Event | null {
  const raw = row.venues;
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v?.approved === false) return null;
  const price = Math.min(4, Math.max(1, Math.round(num(v?.price_level, 2)))) as Event["price_level"];
  const img = resolveImageUrl(row.image_url || v?.image_url);
  const djLineup = Array.isArray(row.dj_lineup)
    ? row.dj_lineup.map((d) => d.trim()).filter(Boolean)
    : undefined;
  const performers = mapPerformers(row.performers) ?? djLineup?.map((name) => ({ name }));
  const now = Date.now();
  const ticketStatuses = (row.tickets ?? []).map((ticket) => {
    const salesOpen = (!ticket.sales_start || new Date(ticket.sales_start).getTime() <= now) && (!ticket.sales_end || new Date(ticket.sales_end).getTime() > now);
    const stockAvailable = ticket.quantity_total == null || ticket.quantity_total > (ticket.quantity_sold ?? 0) + (ticket.quantity_reserved ?? 0);
    return ticket.status === "available" && salesOpen && stockAvailable ? "available" : ticket.status === "closed" || !salesOpen ? "closed" : "sold_out";
  });
  const ticket_status = ticketStatuses.includes("available") ? "available" : ticketStatuses.includes("sold_out") ? "sold_out" : ticketStatuses.includes("closed") ? "closed" : undefined;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description?.trim() || null,
    venue: v
      ? {
          id: v.id,
          slug: v.slug,
          name: v.name,
          image_url: resolveImageUrl(v.image_url),
          category: normalizeCategory(v.category ?? undefined),
          address: v.address?.trim() || undefined,
          city_slug: v.city_slug ?? "prishtina",
          lat: v.lat ?? undefined,
          lng: v.lng ?? undefined,
          is_trending: Boolean(v.is_trending),
          capacity: v.capacity ?? undefined,
        }
      : null,
    starts_at: row.starts_at,
    ends_at: row.ends_at ?? undefined,
    genre: normalizeGenre(row.genre),
    image_url: img,
    venue_name: row.venue_name?.trim() || null,
    dj_lineup: djLineup?.length ? djLineup : undefined,
    performers,
    capacity: row.capacity ?? undefined,
    ticket_url: row.ticket_url?.trim() || null,
    crowd_count: Math.round(num(row.crowd_count, 0)),
    atmosphere_rating: num(row.atmosphere_rating, 0),
    live_status: Boolean(row.live_status),
    reservation_spots_left: row.reservation_spots_left ?? undefined,
    price_level: price,
    fomo_line: row.fomo_line ?? undefined,
    ticket_from_eur: row.ticket_from_eur != null ? num(row.ticket_from_eur, 0) : undefined,
    is_hidden_premium: Boolean(row.is_hidden_premium),
    is_listed_public: row.is_listed_public !== false,
    is_featured: Boolean(row.is_featured),
    city_slug: row.city_slug ?? v?.city_slug ?? "prishtina",
    category: row.category ?? "nightlife",
    tags: Array.isArray(row.tags) ? row.tags.map((tag) => tag.trim()).filter(Boolean) : [],
    is_free: Boolean(row.is_free),
    ticket_status,
  };
}
