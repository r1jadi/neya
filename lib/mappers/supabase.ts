import { resolveImageUrl } from "@/lib/images";
import type { Event, MusicGenre, Venue, VenueCategory } from "@/types";

const GENRES: MusicGenre[] = ["house", "techno", "afro", "hip-hop", "r&b", "latin", "live", "mixed"];

function normalizeGenre(g: string | null | undefined): MusicGenre {
  const x = (g ?? "mixed").toLowerCase().replace(/\s+/g, "-") as MusicGenre;
  return GENRES.includes(x) ? x : "mixed";
}

const CATEGORIES: VenueCategory[] = [
  "club",
  "lounge",
  "bar",
  "rooftop",
  "cafe",
  "live_music",
  "festival",
];

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
  };
}

export function mapEventRow(row: {
  id: string;
  slug: string;
  title: string;
  starts_at: string;
  ends_at?: string | null;
  genre?: string | null;
  image_url?: string | null;
  crowd_count?: number | null;
  atmosphere_rating?: number | string | null;
  live_status?: boolean | null;
  fomo_line?: string | null;
  reservation_spots_left?: number | null;
  ticket_from_eur?: number | string | null;
  is_hidden_premium?: boolean | null;
  is_listed_public?: boolean | null;
  is_featured?: boolean | null;
  venues:
    | {
        id: string;
        slug: string;
        name: string;
        image_url?: string | null;
        price_level?: number | null;
        category?: string | null;
        approved?: boolean | null;
      }
    | Array<{
        id: string;
        slug: string;
        name: string;
        image_url?: string | null;
        price_level?: number | null;
        category?: string | null;
        approved?: boolean | null;
      }>
    | null;
}): Event | null {
  const raw = row.venues;
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (!v || v.approved === false) return null;
  const price = Math.min(4, Math.max(1, Math.round(num(v.price_level, 2)))) as Event["price_level"];
  const img = resolveImageUrl(row.image_url || v.image_url);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    venue: {
      id: v.id,
      slug: v.slug,
      name: v.name,
      image_url: resolveImageUrl(v.image_url),
      category: normalizeCategory(v.category ?? undefined),
    },
    starts_at: row.starts_at,
    ends_at: row.ends_at ?? undefined,
    genre: normalizeGenre(row.genre),
    image_url: img,
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
  };
}
