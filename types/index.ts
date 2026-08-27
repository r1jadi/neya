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

/** Stable database-safe venue category identifiers. `club` remains a legacy value. */
export const VENUE_CATEGORIES = [
  { id: "nightclub", label: "Nightclub" },
  { id: "lounge", label: "Lounge" },
  { id: "bar", label: "Bar" },
  { id: "rooftop", label: "Rooftop" },
  { id: "cafe", label: "Café" },
  { id: "live_music", label: "Live Music" },
  { id: "festival", label: "Festival" },
  { id: "concert_hall", label: "Concert Hall" },
  { id: "arena", label: "Arena" },
  { id: "stadium", label: "Stadium" },
  { id: "open_air_venue", label: "Open Air Venue" },
  { id: "beach_club", label: "Beach Club" },
  { id: "pool_club", label: "Pool Club" },
  { id: "restaurant", label: "Restaurant" },
  { id: "pub", label: "Pub" },
  { id: "cocktail_bar", label: "Cocktail Bar" },
  { id: "wine_bar", label: "Wine Bar" },
  { id: "jazz_club", label: "Jazz Club" },
  { id: "theater", label: "Theater" },
  { id: "cinema", label: "Cinema" },
  { id: "gallery", label: "Gallery" },
  { id: "cultural_center", label: "Cultural Center" },
  { id: "community_space", label: "Community Space" },
  { id: "warehouse", label: "Warehouse" },
  { id: "underground_venue", label: "Underground Venue" },
  { id: "event_hall", label: "Event Hall" },
  { id: "conference_center", label: "Conference Center" },
  { id: "hotel_venue", label: "Hotel Venue" },
  { id: "resort", label: "Resort" },
  { id: "park", label: "Park" },
  { id: "outdoor_space", label: "Outdoor Space" },
  { id: "private_venue", label: "Private Venue" },
  { id: "wedding_venue", label: "Wedding Venue" },
  { id: "university_venue", label: "University Venue" },
  { id: "sports_venue", label: "Sports Venue" },
  { id: "festival_ground", label: "Festival Ground" },
  { id: "clubbing_venue", label: "Clubbing Venue" },
  { id: "music_venue", label: "Music Venue" },
  { id: "exhibition_space", label: "Exhibition Space" },
  { id: "rooftop_bar", label: "Rooftop Bar" },
  { id: "food_hall", label: "Food Hall" },
  { id: "other", label: "Other" },
] as const;

export type VenueCategory = (typeof VENUE_CATEGORIES)[number]["id"] | "club";

export function isVenueCategory(value: string): value is VenueCategory {
  return value === "club" || VENUE_CATEGORIES.some((category) => category.id === value);
}

/** The assignable /places sections for a venue ("All" is implicit and not stored). */
export const PLACES_TYPES = [
  { id: "breakfast", label: "Breakfast" },
  { id: "coffee", label: "Coffee" },
  { id: "lunch", label: "Lunch" },
  { id: "work_study", label: "Work & Study" },
  { id: "dinner", label: "Dinner" },
  { id: "drinks", label: "Drinks" },
  { id: "nightlife", label: "Nightlife" },
] as const;

export type PlacesTypeId = (typeof PLACES_TYPES)[number]["id"];

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
  /** Day parts when this venue is open for Places (morning/daytime/evening/late_night). */
  day_parts?: string[];
  /** Places sections this venue is explicitly assigned to (breakfast/coffee/lunch/work_study/dinner/drinks/nightlife). Empty = legacy inference. */
  places_types?: string[];
}

export type EventVenue = Pick<
  Venue,
  "id" | "slug" | "name" | "image_url" | "category" | "address" | "city_slug" | "lat" | "lng" | "is_trending" | "capacity"
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
  /** Free-text location for venue-less events (no NEYA Venue record). */
  venue_name?: string | null;
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
  city_slug?: string;
  category?: string;
  tags?: string[];
  is_free?: boolean;
  /** Derived only from NEYA's own ticket tiers; absent when no internal tier exists. */
  ticket_status?: "available" | "sold_out" | "closed";
}

export interface StoryItem {
  id: string;
  venue_slug: string;
  venue_name: string;
  thumbnail_url: string;
  label: string;
}

/** A DJ/artist in the directory. */
export interface Artist {
  id: string;
  slug: string;
  name: string;
  bio?: string | null;
  short_bio?: string | null;
  profile_image?: string | null;
  cover_image?: string | null;
  genres: string[];
  instagram_url?: string | null;
  spotify_url?: string | null;
  soundcloud_url?: string | null;
  website_url?: string | null;
  is_verified: boolean;
  is_featured: boolean;
  is_active?: boolean;
  follower_count?: number;
  /** Next upcoming gig, when one exists (for “playing soon” indicators). */
  next_gig?: {
    id: string;
    slug: string;
    title: string;
    starts_at: string;
    venue_name?: string | null;
  } | null;
  /** Upcoming gigs for the profile page. */
  upcoming_gigs?: ArtistGig[];
}

/** A single upcoming gig on an artist profile. */
export interface ArtistGig {
  id: string;
  slug: string;
  title: string;
  starts_at: string;
  ends_at?: string | null;
  image_url?: string | null;
  genre?: string | null;
  venue: { id: string; slug: string; name: string } | null;
}

/** Minimal artist reference for event/venue lineups. */
export interface ArtistLineupRef {
  id: string;
  slug: string;
  name: string;
  genres: string[];
  profile_image?: string | null;
}

/** A venue's admin-written weekly highlight ("This Week" post). */
export interface VenueHighlight {
  id: string;
  venue_id: string;
  event_id?: string | null;
  title: string;
  content: string;
  image_url?: string | null;
  week_start: string; // YYYY-MM-DD
  week_end: string; // YYYY-MM-DD
  is_active: boolean;
  created_at: string;
  venue?: {
    id: string;
    slug: string;
    name: string;
    image_url?: string | null;
    category?: string | null;
    is_featured?: boolean | null;
  } | null;
  event?: {
    id: string;
    slug: string;
    title: string;
    starts_at?: string | null;
  } | null;
}

/** A My Night stop is either a venue or an event. */
export type MyNightStopKind = "venue" | "event";

/** A fully resolved My Night stop for display (server or card snapshot). */
export interface NightStopDisplay {
  /** night_plan_stops.id — empty for guest/local stops until persisted. */
  stopId: string;
  kind: MyNightStopKind;
  refId: string;
  title: string;
  subtitle?: string | null;
  /** Event start time (ISO) — null for plain venue stops. */
  time?: string | null;
  /** Event end time (ISO) — for time-aware status and conflict detection. */
  endsAt?: string | null;
  image?: string | null;
  /** Link target slug (event or venue). */
  slug?: string | null;
  lat?: number | null;
  lng?: number | null;
  available: boolean;
}

/** A My Night plan with resolved stops. */
export interface MyNightPlan {
  planId: string;
  title: string;
  stops: NightStopDisplay[];
}
