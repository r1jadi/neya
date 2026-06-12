import { NextResponse } from "next/server";
import { getEventsNearStop } from "@/services/guides";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json({ events: [] });
  }

  const events = await getEventsNearStop(lat, lng);
  return NextResponse.json({
    events: events.map((e) => ({
      slug: e.slug,
      title: e.title,
      starts_at: e.starts_at,
    })),
  });
}
