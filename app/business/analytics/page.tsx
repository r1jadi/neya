import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Analytics · Venue hub · ${SITE.name}`,
};

export default async function BusinessAnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/business/analytics");

  const { data: venues } = await supabase.from("venues").select("id").eq("owner_id", user.id);
  const ids = venues?.map((v) => v.id) ?? [];

  let resCount = 0;
  let glCount = 0;
  let paidTickets = 0;
  if (ids.length) {
    const { count: rc } = await supabase.from("reservations").select("id", { count: "exact", head: true }).in("venue_id", ids);
    resCount = rc ?? 0;
    const { data: evs } = await supabase.from("events").select("id").in("venue_id", ids);
    const eids = evs?.map((e) => e.id) ?? [];
    if (eids.length) {
      const { count: gc } = await supabase
        .from("guestlist_requests")
        .select("id", { count: "exact", head: true })
        .in("event_id", eids)
        .in("status", ["approved", "checked_in"]);
      glCount = gc ?? 0;
      const { data: tks } = await supabase.from("tickets").select("id").in("event_id", eids);
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
  }

  const stats = [
    { label: "Total reservations", value: resCount },
    { label: "Approved on guestlist", value: glCount },
    { label: "Paid tickets (your events)", value: paidTickets },
  ];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white">Analytics</h1>
      <p className="mt-2 text-sm text-white/55">Snapshot counts — funnel charts and exports come next.</p>
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-3xl font-bold tabular-nums text-white">{s.value}</p>
            <p className="mt-2 text-xs uppercase tracking-wider text-white/45">{s.label}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
