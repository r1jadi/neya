export type MusicGenre =
  | "house"
  | "deep house"
  | "tech house"
  | "progressive house"
  | "afro house"
  | "melodic house"
  | "techno"
  | "melodic techno"
  | "minimal"
  | "hard techno"
  | "trance"
  | "psytrance"
  | "drum & bass"
  | "dubstep"
  | "garage"
  | "uk garage"
  | "bass house"
  | "future house"
  | "edm"
  | "electro"
  | "electro house"
  | "big room"
  | "dance"
  | "disco"
  | "funk"
  | "soul"
  | "jazz"
  | "blues"
  | "r&b"
  | "hip hop"
  | "rap"
  | "trap"
  | "pop"
  | "rock"
  | "alternative rock"
  | "indie"
  | "metal"
  | "punk"
  | "reggae"
  | "dancehall"
  | "reggaeton"
  | "latin"
  | "salsa"
  | "bachata"
  | "kizomba"
  | "folk"
  | "world"
  | "classical"
  | "opera"
  | "ambient"
  | "lo-fi"
  | "chillout"
  | "lounge"
  | "acoustic"
  | "live music"
  | "balkan"
  | "albanian"
  | "serbian"
  | "macedonian"
  | "turkish"
  | "greek"
  | "arabic"
  | "instrumental"
  | "experimental"
  | "afro"
  | "mixed"
  | "other";

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
  capacity?: number;
  website?: string;
  contact_email?: string;
  contact_phone?: string;
  social_links?: any;
  gallery_urls?: string[];
  music_genres?: string[];
  description?: string;
}

export type EventVenue = Pick<
  Venue,
  "id" | "slug" | "name" | "image_url" | "category" | "address" | "city_slug" | "lat" | "lng" | "is_trending"
>;

export interface LineupMember {
  name: string;
  image?: string;
  genre?: string;
  socials?: {
    instagram?: string;
    soundcloud?: string;
    spotify?: string;
    [key: string]: string | undefined;
  };
}

export interface Event {
  id: string;
  slug: string;
  title: string;
  venue?: EventVenue | null;
  starts_at: string;
  ends_at?: string;
  genre: MusicGenre;
  image_url: string;
  description?: string | null;
  lineup?: LineupMember[];
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
