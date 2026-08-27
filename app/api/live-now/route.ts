import { NextResponse } from "next/server";
import { getTonightEvents } from "@/services/events";
import { getVenuesForCity } from "@/services/venues";
import { buildLiveNowItems, LIVE_NOW_FILTERS, type LiveNowFilter } from "@/lib/live-now";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const filter = (params.get("filter") ?? "all") as LiveNowFilter;
  if (!LIVE_NOW_FILTERS.includes(filter)) return NextResponse.json({ error: "Invalid live-now filter" }, { status: 400 });
  const city = params.get("area")?.trim() || undefined;
  const [events, venues] = await Promise.all([getTonightEvents(), getVenuesForCity(city)]);
  return NextResponse.json({ now: new Date().toISOString(), filter, items: buildLiveNowItems(events, venues, filter) });
}
