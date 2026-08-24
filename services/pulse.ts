import { getPublicSupabase } from "@/lib/supabase/public-server";
import { CITY_TZ } from "@/lib/event-dates";

export interface EventPulse {
  /** Average overall vibe (0–10) from real reviews, or null. */
  overall: number | null;
  music: number | null;
  crowd: number | null;
  line: number | null;
  /** Number of reviews included. */
  samples: number;
  /** Hourly overall-vibe average over the last 12h (for the pulse curve). */
  hourly: { label: string; score: number }[];
  /** ISO timestamp of the most recent review feeding the pulse. */
  updatedAt: string | null;
}

export type VenuePulse = EventPulse;

type ReviewRow = {
  music_quality: number | null;
  crowd_energy: number | null;
  line_wait: number | null;
  overall_vibe: number | null;
  created_at: string;
};

function avg(values: number[]): number | null {
  if (!values.length) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round((sum / values.length) * 10) / 10;
}

async function fetchPulseRows(
  supabase: ReturnType<typeof getPublicSupabase>,
  column: "event_id" | "venue_id",
  id: string,
): Promise<{ rows: ReviewRow[]; updatedAt: string | null }> {
  if (!supabase) return { rows: [], updatedAt: null };
  const { data, error } = await supabase
    .from("reviews")
    .select("music_quality, crowd_energy, line_wait, overall_vibe, created_at")
    .eq(column, id)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error("[neya] fetchPulseRows", error.message);
    return { rows: [], updatedAt: null };
  }

  const rows = (data ?? []) as ReviewRow[];
  return { rows, updatedAt: rows[0]?.created_at ?? null };
}

function aggregatePulse(rows: ReviewRow[]): EventPulse {
  const overall = avg(rows.map((r) => r.overall_vibe).filter((v): v is number => v != null));
  const music = avg(rows.map((r) => r.music_quality).filter((v): v is number => v != null));
  const crowd = avg(rows.map((r) => r.crowd_energy).filter((v): v is number => v != null));
  const line = avg(rows.map((r) => r.line_wait).filter((v): v is number => v != null));

  // Hourly curve over the last 12h (boundary-aware buckets in the city timezone).
  const hourly: { label: string; score: number }[] = [];
  const now = new Date();
  const buckets = new Map<number, number[]>();
  for (const row of rows) {
    const created = new Date(row.created_at).getTime();
    if (now.getTime() - created > 12 * 3600000 || created > now.getTime()) continue;
    if (row.overall_vibe == null) continue;
    const hour = cityHour(created);
    const list = buckets.get(hour) ?? [];
    list.push(row.overall_vibe);
    buckets.set(hour, list);
  }
  for (const [hour, values] of [...buckets.entries()].sort((a, b) => a[0] - b[0])) {
    hourly.push({ label: `${String(hour).padStart(2, "0")}:00`, score: avg(values)! });
  }

  return {
    overall,
    music,
    crowd,
    line,
    samples: rows.length,
    hourly,
    updatedAt: rows[0]?.created_at ?? null,
  };
}

/** Real pulse aggregates for an event, from the public recent-reviews window (never fabricated). */
export async function getEventPulse(eventId: string): Promise<EventPulse | null> {
  if (!eventId) return null;
  try {
    const supabase = getPublicSupabase();
    if (!supabase) return null;
    const { rows } = await fetchPulseRows(supabase, "event_id", eventId);
    return aggregatePulse(rows);
  } catch (error) {
    console.error("[neya] getEventPulse", error);
    return null;
  }
}

/** Real pulse aggregates for a venue, from reviews across all of its events. */
export async function getVenuePulse(venueId: string): Promise<VenuePulse | null> {
  if (!venueId) return null;
  try {
    const supabase = getPublicSupabase();
    if (!supabase) return null;
    const { rows } = await fetchPulseRows(supabase, "venue_id", venueId);
    return aggregatePulse(rows);
  } catch (error) {
    console.error("[neya] getVenuePulse", error);
    return null;
  }
}

function cityHour(ms: number): number {
  const part = new Intl.DateTimeFormat("en-GB", { timeZone: CITY_TZ, hour: "numeric", hour12: false })
    .formatToParts(new Date(ms))
    .find((p) => p.type === "hour")?.value;
  const n = parseInt(part ?? "0", 10);
  return n === 24 ? 0 : n;
}