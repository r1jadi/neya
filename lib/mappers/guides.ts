import { resolveImageUrl } from "@/lib/images";
import type {
  Guide,
  GuideDay,
  GuideStop,
  GuideTransport,
  IntercityBusRoute,
} from "@/types/guides";

type GuideRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  duration_days: number | null;
  duration_label: string | null;
  location_type: string;
  location_name: string | null;
  price: number;
  currency: string;
  difficulty: string;
  featured: boolean;
  published: boolean;
  categories: string[] | null;
  best_season: string | null;
  daily_budget_eur: number | null;
  total_budget_eur: number | null;
  avg_visit_duration_minutes: number | null;
  family_friendly: boolean;
  created_at?: string;
  updated_at?: string;
};

type GuideDayRow = {
  id: string;
  guide_id: string;
  day_number: number;
  title: string;
  description: string | null;
};

type GuideStopRow = {
  id: string;
  guide_day_id: string;
  name: string;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  category: string;
  image: string | null;
  estimated_visit_time: number | null;
  order_index: number;
};

type GuideTransportRow = {
  id: string;
  guide_stop_id: string;
  transport_type: string;
  station_name: string | null;
  station_latitude: number | null;
  station_longitude: number | null;
  departure_frequency: string | null;
  notes: string | null;
  route_name: string | null;
  route_origin: string | null;
  route_destination: string | null;
  intercity_route_id: string | null;
};

export function mapGuideTransportRow(row: GuideTransportRow): GuideTransport {
  return {
    id: row.id,
    guide_stop_id: row.guide_stop_id,
    transport_type: row.transport_type as GuideTransport["transport_type"],
    station_name: row.station_name,
    station_latitude: row.station_latitude,
    station_longitude: row.station_longitude,
    departure_frequency: row.departure_frequency,
    notes: row.notes,
    route_name: row.route_name,
    route_origin: row.route_origin,
    route_destination: row.route_destination,
    intercity_route_id: row.intercity_route_id,
  };
}

export function mapGuideStopRow(row: GuideStopRow, transports?: GuideTransportRow[]): GuideStop {
  return {
    id: row.id,
    guide_day_id: row.guide_day_id,
    name: row.name,
    description: row.description,
    latitude: row.latitude,
    longitude: row.longitude,
    category: row.category as GuideStop["category"],
    image: row.image ? resolveImageUrl(row.image) : null,
    estimated_visit_time: row.estimated_visit_time,
    order_index: row.order_index,
    transports: transports?.map(mapGuideTransportRow),
  };
}

export function mapGuideDayRow(row: GuideDayRow, stops?: GuideStop[]): GuideDay {
  return {
    id: row.id,
    guide_id: row.guide_id,
    day_number: row.day_number,
    title: row.title,
    description: row.description,
    stops,
  };
}

export function mapGuideRow(row: GuideRow, extras?: Partial<Guide>): Guide {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    cover_image: resolveImageUrl(row.cover_image),
    duration_days: row.duration_days,
    duration_label: row.duration_label,
    location_type: row.location_type as Guide["location_type"],
    location_name: row.location_name,
    price: Number(row.price) || 0,
    currency: row.currency || "EUR",
    difficulty: row.difficulty as Guide["difficulty"],
    featured: row.featured,
    published: row.published,
    categories: (row.categories ?? []) as Guide["categories"],
    best_season: row.best_season,
    daily_budget_eur: row.daily_budget_eur != null ? Number(row.daily_budget_eur) : null,
    total_budget_eur: row.total_budget_eur != null ? Number(row.total_budget_eur) : null,
    avg_visit_duration_minutes: row.avg_visit_duration_minutes,
    family_friendly: row.family_friendly,
    created_at: row.created_at,
    updated_at: row.updated_at,
    ...extras,
  };
}

export function mapIntercityRouteRow(row: {
  id: string;
  origin: string;
  destination: string;
  route_name: string;
  station_name: string | null;
  station_latitude: number | null;
  station_longitude: number | null;
  departure_frequency: string | null;
  notes: string | null;
  active: boolean;
}): IntercityBusRoute {
  return {
    id: row.id,
    origin: row.origin,
    destination: row.destination,
    route_name: row.route_name,
    station_name: row.station_name,
    station_latitude: row.station_latitude,
    station_longitude: row.station_longitude,
    departure_frequency: row.departure_frequency,
    notes: row.notes,
    active: row.active,
  };
}
