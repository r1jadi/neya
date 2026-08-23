import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublishedGuides, generateItineraryFromGuides } from "@/services/guides";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import type { ItineraryPreferences } from "@/types/guides";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 64 * 1024;

/** Hard caps on client-controlled itinerary inputs (mirrors the form's bounds). */
function parsePreferences(raw: unknown): ItineraryPreferences | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const value = raw as Record<string, unknown>;

  const durationDays = Math.round(Number(value.duration_days));
  if (!Number.isFinite(durationDays) || durationDays < 1 || durationDays > 14) return null;

  const budgetEur = Number(value.budget_eur);
  if (!Number.isFinite(budgetEur) || budgetEur < 0 || budgetEur > 100_000 || !Number.isInteger(budgetEur * 100)) {
    return null;
  }

  const interests = Array.isArray(value.interests)
    ? value.interests
        .filter((i): i is string => typeof i === "string")
        .map((i) => i.trim().slice(0, 80))
        .filter(Boolean)
        .slice(0, 24)
    : [];
  if (interests.some((i) => i.length === 0)) return null;

  for (const flag of ["nightlife", "nature", "food", "culture", "hiking"] as const) {
    if (value[flag] !== undefined && typeof value[flag] !== "boolean") return null;
  }

  return {
    duration_days: durationDays,
    budget_eur: Math.round(budgetEur * 100) / 100,
    interests,
    nightlife: value.nightlife === true,
    nature: value.nature === true,
    food: value.food === true,
    culture: value.culture === true,
    hiking: value.hiking === true,
  };
}

export async function POST(req: Request) {
  const contentLength = req.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ip = await getClientIp(req.headers);
  const rateKey = user?.id ? `itinerary:${user.id}` : `itinerary:${ip || "anon"}`;
  const rl = await rateLimit(rateKey, 30, 3600);
  if (!rl.success) return NextResponse.json({ error: "rate" }, { status: 429 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const preferences = parsePreferences(body);
  if (!preferences) {
    return NextResponse.json({ error: "Invalid preferences" }, { status: 400 });
  }

  const guides = await getPublishedGuides(supabase);
  const fullGuides = await Promise.all(
    guides.map(async (g) => {
      const { getGuideBySlug } = await import("@/services/guides");
      return getGuideBySlug(g.slug, supabase) ?? g;
    }),
  );

  const itinerary = await generateItineraryFromGuides(
    preferences,
    fullGuides.filter((g): g is NonNullable<typeof g> => g != null),
  );

  try {
    const admin = createAdminClient();
    await admin.from("guide_itinerary_requests").insert({
      user_id: user?.id ?? null,
      preferences,
      result: itinerary,
      status: "completed",
    });
  } catch {
    /* table may not exist yet in dev */
  }

  return NextResponse.json({ itinerary, status: "mock" });
}