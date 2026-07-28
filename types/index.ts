export const MUSIC_GENRES = [
  { id: "acoustic", label: "Acoustic" },
  { id: "afro_house", label: "Afro House" },
  { id: "albanian", label: "Albanian" },
  { id: "alternative_rock", label: "Alternative Rock" },
  { id: "ambient", label: "Ambient" },
  { id: "arabic", label: "Arabic" },
  { id: "bachata", label: "Bachata" },
  { id: "balkan", label: "Balkan" },
  { id: "bass_house", label: "Bass House" },
  { id: "big_room", label: "Big Room" },
  { id: "blues", label: "Blues" },
  { id: "classical", label: "Classical" },
  { id: "dance", label: "Dance" },
  { id: "dancehall", label: "Dancehall" },
  { id: "deep_house", label: "Deep House" },
  { id: "disco", label: "Disco" },
  { id: "drum_and_bass", label: "Drum & Bass" },
  { id: "dubstep", label: "Dubstep" },
  { id: "edm", label: "EDM" },
  { id: "electro", label: "Electro" },
  { id: "electro_house", label: "Electro House" },
  { id: "experimental", label: "Experimental" },
  { id: "folk", label: "Folk" },
  { id: "funk", label: "Funk" },
  { id: "future_house", label: "Future House" },
  { id: "garage", label: "Garage" },
  { id: "greek", label: "Greek" },
  { id: "hard_techno", label: "Hard Techno" },
  { id: "hip_hop", label: "Hip Hop" },
  { id: "house", label: "House" },
  { id: "indie", label: "Indie" },
  { id: "instrumental", label: "Instrumental" },
  { id: "jazz", label: "Jazz" },
  { id: "kizomba", label: "Kizomba" },
  { id: "latin", label: "Latin" },
  { id: "live_music", label: "Live Music" },
  { id: "lo_fi", label: "Lo-fi" },
  { id: "lounge", label: "Lounge" },
  { id: "macedonian", label: "Macedonian" },
  { id: "melodic_house", label: "Melodic House" },
  { id: "melodic_techno", label: "Melodic Techno" },
  { id: "metal", label: "Metal" },
  { id: "minimal", label: "Minimal" },
  { id: "opera", label: "Opera" },
  { id: "other", label: "Other" },
  { id: "pop", label: "Pop" },
  { id: "progressive_house", label: "Progressive House" },
  { id: "punk", label: "Punk" },
  { id: "psytrance", label: "Psytrance" },
  { id: "r_and_b", label: "R&B" },
  { id: "rap", label: "Rap" },
  { id: "reggae", label: "Reggae" },
  { id: "reggaeton", label: "Reggaeton" },
  { id: "rock", label: "Rock" },
  { id: "salsa", label: "Salsa" },
  { id: "serbian", label: "Serbian" },
  { id: "soul", label: "Soul" },
  { id: "tech_house", label: "Tech House" },
  { id: "techno", label: "Techno" },
  { id: "trance", label: "Trance" },
  { id: "trap", label: "Trap" },
  { id: "turkish", label: "Turkish" },
  { id: "uk_garage", label: "UK Garage" },
  { id: "world", label: "World" },
] as const;

export type MusicGenre = (typeof MUSIC_GENRES)[number]["id"] | "afro" | "hip-hop" | "r&b" | "live" | "mixed";

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
  description?: string;
  gallery_urls?: string[];
  music_genres?: string[];
  social_links?: Record<string, string>;
  website_url?: string;
  contact_email?: string;
  contact_phone?: string;
  capacity?: number;
}

export type EventVenue = Pick<
  Venue,
  "id" | "slug" | "name" | "image_url" | "category" | "address" | "city_slug" | "lat" | "lng" | "is_trending"
>;

export type EventPerformer = {
  name: string;
  image_url?: string;
  genre?: string;
  social_links?: Record<string, string>;
};

export interface Event {
  id: string;
  slug: string;
  title: string;
  venue: EventVenue | null;
  starts_at: string;
  ends_at?: string;
  genre: MusicGenre;
  image_url: string;
  description?: string | null;
  dj_lineup?: string[];
  performers?: EventPerformer[];
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
