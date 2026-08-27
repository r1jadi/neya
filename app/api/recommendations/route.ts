import { NextResponse } from "next/server";
import { getTonightEvents } from "@/services/events";
import { getVenuesForCity } from "@/services/venues";
import { rankTonightRecommendations, VIBES, BUDGETS, type RecommendationPreferences } from "@/lib/recommendations";

export const dynamic = "force-dynamic";

function parseList(value: string | null): string[] | undefined {
  if (!value) return undefined;
  const values = value.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 20);
  return values.length ? values : undefined;
}

function parseNumber(value: string | null): number | undefined {
  if (value == null || value.trim() === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const vibe = params.get("vibe")?.trim().toLowerCase() as RecommendationPreferences["vibe"];
  const budget = params.get("budget")?.trim() as RecommendationPreferences["budget"];
  const maxDistanceKm = parseNumber(params.get("distance"));
  const limit = parseNumber(params.get("limit"));

  if (vibe && !VIBES.includes(vibe)) return NextResponse.json({ error: "Invalid vibe" }, { status: 400 });
  if (budget && !BUDGETS.includes(budget)) return NextResponse.json({ error: "Invalid budget" }, { status: 400 });
  if (params.get("distance") && maxDistanceKm == null) return NextResponse.json({ error: "Invalid distance" }, { status: 400 });
  if (params.get("limit") && (limit == null || limit < 1)) return NextResponse.json({ error: "Invalid limit" }, { status: 400 });

  const city = params.get("area")?.trim() || undefined;
  const [events, venues] = await Promise.all([getTonightEvents(), getVenuesForCity(city)]);
  const preferences: RecommendationPreferences = {
    vibe,
    budget,
    maxDistanceKm,
    categories: parseList(params.get("categories")),
    from: params.get("from") || undefined,
    to: params.get("to") || undefined,
    area: city,
    limit,
    currentTime: new Date().toISOString(),
  };
  const recommendations = rankTonightRecommendations(events, venues, preferences);
  return NextResponse.json({ tonight: true, preferences, recommendations });
}
