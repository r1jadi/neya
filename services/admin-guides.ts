import { createAdminClient } from "@/lib/supabase/admin";
import type { GuideDay, GuideStop, GuideTransport } from "@/types/guides";

export type AdminGuideRow = {
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
  categories: string[];
  best_season: string | null;
  daily_budget_eur: number | null;
  total_budget_eur: number | null;
  avg_visit_duration_minutes: number | null;
  family_friendly: boolean;
  created_at: string;
  updated_at: string;
};

export type AdminGuideDayRow = {
  id: string;
  guide_id: string;
  day_number: number;
  title: string;
  description: string | null;
};

export type AdminGuideStopRow = GuideStop & { transports?: GuideTransport[] };

export type AdminIntercityRouteRow = {
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
};

export async function getAdminGuides(): Promise<AdminGuideRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("guides")
    .select(
      "id, slug, title, description, cover_image, duration_days, duration_label, location_type, location_name, price, currency, difficulty, featured, published, categories, best_season, daily_budget_eur, total_budget_eur, avg_visit_duration_minutes, family_friendly, created_at, updated_at",
    )
    .order("created_at", { ascending: false });
  return (data ?? []) as AdminGuideRow[];
}

export async function getAdminGuideDetail(guideId: string): Promise<{
  guide: AdminGuideRow | null;
  days: (AdminGuideDayRow & { stops: AdminGuideStopRow[] })[];
}> {
  const admin = createAdminClient();
  const { data: guide } = await admin
    .from("guides")
    .select(
      "id, slug, title, description, cover_image, duration_days, duration_label, location_type, location_name, price, currency, difficulty, featured, published, categories, best_season, daily_budget_eur, total_budget_eur, avg_visit_duration_minutes, family_friendly, created_at, updated_at",
    )
    .eq("id", guideId)
    .maybeSingle();

  if (!guide) return { guide: null, days: [] };

  const { data: dayRows } = await admin
    .from("guide_days")
    .select("id, guide_id, day_number, title, description")
    .eq("guide_id", guideId)
    .order("day_number");

  const dayIds = (dayRows ?? []).map((d) => d.id);
  let stopRows: AdminGuideStopRow[] = [];
  if (dayIds.length) {
    const { data: stops } = await admin
      .from("guide_stops")
      .select("id, guide_day_id, name, description, latitude, longitude, category, image, estimated_visit_time, order_index")
      .in("guide_day_id", dayIds)
      .order("order_index");

    const stopIds = (stops ?? []).map((s) => s.id);
    let transports: GuideTransport[] = [];
    if (stopIds.length) {
      const { data: tr } = await admin
        .from("guide_transports")
        .select("id, guide_stop_id, transport_type, station_name, station_latitude, station_longitude, departure_frequency, notes, route_name, route_origin, route_destination, intercity_route_id")
        .in("guide_stop_id", stopIds);
      transports = (tr ?? []) as GuideTransport[];
    }

    stopRows = (stops ?? []).map((s) => ({
      ...s,
      category: s.category as GuideStop["category"],
      transports: transports.filter((t) => t.guide_stop_id === s.id),
    }));
  }

  const days = (dayRows ?? []).map((day) => ({
    ...day,
    stops: stopRows.filter((s) => s.guide_day_id === day.id),
  }));

  return { guide: guide as AdminGuideRow, days };
}

export async function getAdminIntercityRoutes(): Promise<AdminIntercityRouteRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("intercity_bus_routes")
    .select("id, origin, destination, route_name, station_name, station_latitude, station_longitude, departure_frequency, notes, active")
    .order("route_name");
  return (data ?? []) as AdminIntercityRouteRow[];
}
