"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/utils";

const METRICS = new Set([
  "discovery_search", "discovery_filter", "event_view", "venue_view", "city_view",
  "category_select", "calendar_add", "ticket_click", "reservation_click", "guide_view",
  "map_interaction", "event_submission", "event_save", "venue_save",
]);

type Dimensions = Record<string, string | number | boolean | null | undefined>;

/** Best-effort product telemetry. It intentionally carries no user identifiers or free-form search text. */
export async function trackDiscoveryMetric(metric: string, options: { eventId?: string; venueId?: string; dimensions?: Dimensions } = {}) {
  if (!METRICS.has(metric)) return;
  const dimensions = Object.fromEntries(
    Object.entries(options.dimensions ?? {}).slice(0, 12).flatMap(([key, value]) => {
      if (!/^[a-z_]{1,48}$/.test(key) || (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean" && value !== null)) return [];
      return [[key, typeof value === "string" ? value.slice(0, 120) : value]];
    }),
  );
  try {
    await createAdminClient().from("analytics").insert({
      metric,
      value: 1,
      event_id: isUuid(options.eventId ?? "") ? options.eventId : null,
      venue_id: isUuid(options.venueId ?? "") ? options.venueId : null,
      dimensions,
    });
  } catch (error) {
    console.error("[neya] discovery analytics", error);
  }
}
