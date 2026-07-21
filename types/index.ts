export type MusicGenre =
  | "house"
  | "techno"
  | "afro"
  | "hip-hop"
  | "r&b"
  | "latin"
  | "live"
  | "mixed";

export type VenueCategory =
  | "club"
  | "lounge"
  | "bar"
  | "rooftop"
  | "cafe"
  | "live_music"
  | "festival";

export type LiveVibe = "packed" | "chill" | "energetic" | "vip";

export type PriceLevel = 1 | 2 | 3 | 4;

export interface Venue {
  id: string;
  slug: string;
  name: string;
  city_slug: string;
  category: VenueCategory;
  address?: string;
  lat?: number;
  lng?: number;
  image_url: string;
  price_level: PriceLevel;
  atmosphere_score?: number;
  crowd_count?: number;
  is_live?: boolean;
  is_featured?: boolean;
  is_trending?: boolean;
  distance_km?: number;
}

export type EventVenue = Pick<
  Venue,
  "id" | "slug" | "name" | "image_url" | "category" | "address" | "city_slug" | "lat" | "lng" | "is_trending"
>;

export interface Event {
  id: string;
  slug: string;
  title: string;
  venue: EventVenue;
  starts_at: string;
  ends_at?: string;
  genre: MusicGenre;
  image_url: string;
  description?: string | null;
  dj_lineup?: string[];
  capacity?: number | null;
  ticket_url?: string | null;
  crowd_count: number;
  atmosphere_rating: number;
  live_status: boolean;
  reservation_spots_left?: number;
  distance_km?: number;
  price_level: PriceLevel;
  fomo_line?: string;
  ticket_from_eur?: number;
  is_hidden_premium?: boolean;
  is_listed_public?: boolean;
  is_featured?: boolean;
}

export interface StoryItem {
  id: string;
  venue_slug: string;
  venue_name: string;
  thumbnail_url: string;
  label: string;
}
