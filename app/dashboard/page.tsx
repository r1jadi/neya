import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { createClient } from "@/lib/supabase/server";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Your NEYA · ${SITE.name}`,
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  const { data: profile } = await supabase.from("profiles").select("onboarding_complete").eq("id", user.id).maybeSingle();
  if (!profile?.onboarding_complete) redirect("/onboarding");

  const { data: reservations } = await supabase
    .from("reservations")
    .select("id, status, party_size, created_at, deposit_cents, venues(name, slug)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: guestlist } = await supabase
    .from("guestlist_entries")
    .select("id, status, created_at, guestlists(name, events(title, slug))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: orders } = await supabase
    .from("ticket_orders")
    .select("id, status, created_at, qr_payload, tickets(tier_name, events(title, slug))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: saved } = await supabase
    .from("saved_events")
    .select("event_id, created_at, events(slug, title)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white">Your NEYA</h1>
        <p className="mt-1 text-sm text-white/55">Reservations, tickets, and saved nights.</p>

        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/45">Saved events</h2>
          <ul className="mt-3 space-y-2">
            {saved?.length ? (
              saved.map((s) => {
                const ev = s.events as { slug?: string; title?: string } | null;
                return (
                  <li key={s.event_id} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm">
                    {ev?.slug ? (
                      <Link href={`/events/${ev.slug}`} className="font-medium text-white hover:underline">
                        {ev?.title ?? "Event"}
                      </Link>
                    ) : (
                      <span className="text-white/50">Event unavailable</span>
                    )}
                  </li>
                );
              })
            ) : (
              <li className="text-sm text-white/45">Save events from the feed or event page.</li>
            )}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/45">Guestlists</h2>
          <ul className="mt-3 space-y-2">
            {guestlist?.length ? (
              guestlist.map((g) => {
                const gl = g.guestlists as { name?: string; events?: { title?: string; slug?: string } | null } | null;
                const ev = gl?.events;
                return (
                  <li
                    key={g.id}
                    className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/80"
                  >
                    <span className="font-medium text-white">{ev?.title ?? "Event"}</span> · {gl?.name ?? "List"} ·{" "}
                    <span className="text-sky-200/90">{g.status}</span>
                    {ev?.slug ? (
                      <Link href={`/events/${ev.slug}`} className="ml-2 text-xs text-sky-300 hover:underline">
                        View
                      </Link>
                    ) : null}
                  </li>
                );
              })
            ) : (
              <li className="text-sm text-white/45">No guestlist requests yet.</li>
            )}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/45">Table holds</h2>
          <ul className="mt-3 space-y-2">
            {reservations?.length ? (
              reservations.map((r) => (
                <li
                  key={r.id}
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/80"
                >
                  <span className="font-medium text-white">
                    {(r.venues as { name?: string } | null)?.name ?? "Venue"}
                  </span>{" "}
                  · {r.party_size} guests ·{" "}
                  <span className="text-sky-200/90">{r.status}</span>
                  {r.deposit_cents != null ? <span className="text-white/45"> · €{(r.deposit_cents / 100).toFixed(0)}</span> : null}
                </li>
              ))
            ) : (
              <li className="text-sm text-white/45">No reservations yet.</li>
            )}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/45">Tickets</h2>
          <ul className="mt-3 space-y-2">
            {orders?.length ? (
              orders.map((o) => {
                const t = o.tickets as { tier_name?: string; events?: { title?: string; slug?: string } | null } | null;
                const ev = t?.events;
                return (
                  <li
                    key={o.id}
                    className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/80"
                  >
                    <span className="font-medium text-white">{ev?.title ?? "Event"}</span> · {t?.tier_name ?? "Ticket"}{" "}
                    · <span className="text-sky-200/90">{o.status}</span>
                    {o.status === "paid" && o.qr_payload ? (
                      <span className="mt-2 block font-mono text-xs text-white/50">QR: {o.qr_payload}</span>
                    ) : null}
                    {ev?.slug ? (
                      <Link href={`/events/${ev.slug}`} className="ml-2 text-xs text-sky-300 hover:underline">
                        Event page
                      </Link>
                    ) : null}
                  </li>
                );
              })
            ) : (
              <li className="text-sm text-white/45">No ticket orders yet.</li>
            )}
          </ul>
        </section>

        <p className="mt-10 text-center text-sm">
          <Link href="/events" className="text-sky-300 hover:underline">
            Browse tonight
          </Link>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
