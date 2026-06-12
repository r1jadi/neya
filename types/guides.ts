export type GuideLocationType = "prishtina" | "kosovo" | "city" | "region";

export type GuideDifficulty = "easy" | "moderate" | "advanced";

export type GuideStopCategory =
  | "attractions"
  | "restaurants"
  | "nightlife"
  | "hotels"
  | "bus_stations"
  | "museums"
  | "parks"
  | "shopping"
  | "landmarks"
  | "hiking";

export type GuideTransportType =
  | "urban_bus"
  | "intercity_bus"
  | "taxi"
  | "walking"
  | "car";

export type GuideCategory =
  | "family_friendly"
  | "nightlife"
  | "adventure"
  | "food"
  | "culture"
  | "nature";

export interface GuideTransport {
  id: string;
  guide_stop_id: string;
  transport_type: GuideTransportType;
  station_name?: string | null;
  station_latitude?: number | null;
  station_longitude?: number | null;
  departure_frequency?: string | null;
  notes?: string | null;
  route_name?: string | null;
  route_origin?: string | null;
  route_destination?: string | null;
  intercity_route_id?: string | null;
}

export interface GuideStop {
  id: string;
  guide_day_id: string;
  name: string;
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  category: GuideStopCategory;
  image?: string | null;
  estimated_visit_time?: number | null;
  order_index: number;
  transports?: GuideTransport[];
}

export interface GuideDay {
  id: string;
  guide_id: string;
  day_number: number;
  title: string;
  description?: string | null;
  stops?: GuideStop[];
}

export interface Guide {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  cover_image: string;
  duration_days?: number | null;
  duration_label?: string | null;
  location_type: GuideLocationType;
  location_name?: string | null;
  price: number;
  currency: string;
  difficulty: GuideDifficulty;
  featured: boolean;
  published: boolean;
  categories: GuideCategory[];
  best_season?: string | null;
  daily_budget_eur?: number | null;
  total_budget_eur?: number | null;
  avg_visit_duration_minutes?: number | null;
  family_friendly: boolean;
  created_at?: string;
  updated_at?: string;
  days?: GuideDay[];
  stop_count?: number;
  preview_stops?: GuideStop[];
}

export interface GuidePurchase {
  id: string;
  guide_id: string;
  user_id: string;
  purchase_date: string;
  access_until?: string | null;
  status: "pending" | "active" | "expired";
}

export interface IntercityBusRoute {
  id: string;
  origin: string;
  destination: string;
  route_name: string;
  station_name?: string | null;
  station_latitude?: number | null;
  station_longitude?: number | null;
  departure_frequency?: string | null;
  notes?: string | null;
  active: boolean;
}

export interface ItineraryPreferences {
  duration_days: number;
  budget_eur: number;
  interests: string[];
  nightlife: boolean;
  nature: boolean;
  food: boolean;
  culture: boolean;
  hiking: boolean;
}

export interface GeneratedItinerary {
  guide_slugs: string[];
  summary: string;
  days: { day: number; stops: string[] }[];
}
