import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublishedGuides, generateItineraryFromGuides } from "@/services/guides";
import type { ItineraryPreferences } from "@/types/guides";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: ItineraryPreferences;
  try {
    body = (await req.json()) as ItineraryPreferences;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const guides = await getPublishedGuides(supabase);
  const fullGuides = await Promise.all(
    guides.map(async (g) => {
      const { getGuideBySlug } = await import("@/services/guides");
      return getGuideBySlug(g.slug, supabase) ?? g;
    }),
  );

  const itinerary = await generateItineraryFromGuides(
    body,
    fullGuides.filter((g): g is NonNullable<typeof g> => g != null),
  );

  try {
    const admin = createAdminClient();
    await admin.from("guide_itinerary_requests").insert({
      user_id: user?.id ?? null,
      preferences: body,
      result: itinerary,
      status: "completed",
    });
  } catch {
    /* table may not exist yet in dev */
  }

  return NextResponse.json({ itinerary, status: "mock" });
}
