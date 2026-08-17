import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { MAX_NIGHT_STOPS } from "@/lib/my-night/logic";
import { todayYmdInTz } from "@/lib/event-dates";
import { isUuid } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const rl = await rateLimit("my-night-share", 20, 3600);
  if (!rl.success) return NextResponse.json({ error: "rate" }, { status: 429 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const { title, stops } = (body ?? {}) as { title?: unknown; stops?: unknown };
  if (!Array.isArray(stops) || stops.length === 0 || stops.length > MAX_NIGHT_STOPS) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const parsed = stops.map((stop) => {
    const row = stop as { kind?: unknown; refId?: unknown };
    const kind = row.kind === "venue" ? "venue" : row.kind === "event" ? "event" : null;
    return { kind, refId: typeof row.refId === "string" ? row.refId : "" };
  });
  if (parsed.some((s) => !s.kind || !isUuid(s.refId))) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  // Validate references server-side.
  const admin = createAdminClient();
  for (const stop of parsed) {
    const { data } = await admin
      .from(stop.kind === "venue" ? "venues" : "events")
      .select("id")
      .eq("id", stop.refId)
      .maybeSingle();
    if (!data) return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const token = randomBytes(9).toString("hex");
  const cleanTitle =
    typeof title === "string" && title.trim() ? title.trim().slice(0, 40) : "My Night";

  const { data: plan, error } = await admin
    .from("night_plans")
    .insert({
      user_id: null,
      title: cleanTitle,
      share_token: token,
      plan_date: todayYmdInTz(),
    })
    .select("id")
    .single();
  if (error || !plan) return NextResponse.json({ error: "storage" }, { status: 500 });

  const { error: stopsError } = await admin.from("night_plan_stops").insert(
    parsed.map((stop, i) => ({
      plan_id: plan.id,
      position: i,
      venue_id: stop.kind === "venue" ? stop.refId : null,
      event_id: stop.kind === "event" ? stop.refId : null,
    })),
  );
  if (stopsError) return NextResponse.json({ error: "storage" }, { status: 500 });

  return NextResponse.json({ token });
}
