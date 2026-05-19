import type { Metadata } from "next";
import Link from "next/link";
import { requireVenueUser } from "@/lib/auth/require-venue";
import { createClient } from "@/lib/supabase/server";
import { getEventIdsForVenues } from "@/lib/venue/scope";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Analytics · Venue portal · ${SITE.name}`,
};

export default async function VenueAnalyticsPage() {
  const { venueId } = await requireVenueUser("/venue/analytics");
  const supabase = await createClient();

  let resCount = 0;
  let glRequestCount = 0;
  let pendingGl = 0;
  let paidTickets = 0;

  const { count: rc } = await supabase
    .from("reservations")
    .select("id", { count: "exact", head: true })
    .eq("venue_id", venueId);
  resCount = rc ?? 0;

  const eventIds = await getEventIdsForVenues([venueId]).catch(() => [] as string[]);
  if (eventIds.length) {
    const { count: glc } = await supabase
      .from("guestlist_requests")
      .select("id", { count: "exact", head: true })
      .in("event_id", eventIds);
    glRequestCount = glc ?? 0;

    const { count: pgl } = await supabase
      .from("guestlist_requests")
      .select("id", { count: "exact", head: true })
      .in("event_id", eventIds)
      .eq("status", "pending");
    pendingGl = pgl ?? 0;

    const { data: tks } = await supabase.from("tickets").select("id").in("event_id", eventIds);
    const tkids = tks?.map((t) => t.id) ?? [];
    if (tkids.length) {
      const { count: tc } = await supabase
        .from("ticket_orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "paid")
        .in("ticket_id", tkids);
      paidTickets = tc ?? 0;
    }
  }

  const stats = [
    { label: "Reservations", value: resCount },
    { label: "Guestlist requests", value: glRequestCount },
    { label: "Pending guestlist", value: pendingGl },
    { label: "Paid tickets", value: paidTickets },
  ];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white">Analytics</h1>
      <p className="mt-2 text-sm text-white/55">Read-only snapshot for your venue — no global NEYA data.</p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-3xl font-bold tabular-nums text-white">{s.value}</p>
            <p className="mt-2 text-xs uppercase tracking-wider text-white/45">{s.label}</p>
          </div>
        ))}
      </div>
      <p className="mt-10 text-center text-sm">
        <Link href="/venue" className="text-sky-300 hover:underline">
          Back to overview
        </Link>
      </p>
    </main>
  );
}
