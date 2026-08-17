import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { createClient } from "@/lib/supabase/server";
import { SITE } from "@/lib/constants";
import { TicketCode } from "@/components/neya/ticket-code";
import { getUserPurchasedGuides } from "@/services/guides";
import { getFollowedArtists } from "@/services/artists";
import { guestlistStatusLabel } from "@/lib/guestlist/labels";
import { paymentMethodLabel, paymentStatusLabel, reservationStatusLabel } from "@/lib/reservations/labels";

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
    .select("id, status, party_size, created_at, deposit_cents, payment_method, payment_status, venues(name, slug), events(title, slug)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: guestlistRequests } = await supabase
    .from("guestlist_requests")
    .select("id, status, full_name, group_size, created_at, events(title, slug)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: guestlistEntries } = await supabase
    .from("guestlist_entries")
    .select("id, status, created_at, guestlists(name, events(title, slug))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: orders } = await supabase
    .from("ticket_orders")
    .select("id, status, payment_status, created_at, qr_payload, tickets(tier_name, events(title, slug))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: saved } = await supabase
    .from("saved_events")
    .select("event_id, created_at, events(slug, title, starts_at)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: savedVenues } = await supabase
    .from("saved_venues")
    .select("venue_id, created_at, venues(slug, name, city_slug)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);
  type SavedEventRow = { event_id: string; created_at: string; events: { starts_at?: string } | { starts_at?: string }[] | null };
  const savedEventRow = (item: SavedEventRow) => { const raw = item.events; return Array.isArray(raw) ? raw[0] : raw; };
  const nowMs = new Date().getTime();
  const upcomingSaved = (saved ?? []).filter((item) => {
    const event = savedEventRow(item); return Boolean(event?.starts_at && new Date(event.starts_at).getTime() >= nowMs);
  }).sort((a, b) => new Date(savedEventRow(a)?.starts_at ?? 0).getTime() - new Date(savedEventRow(b)?.starts_at ?? 0).getTime());

  const [purchasedGuides, followedArtists] = await Promise.all([
    getUserPurchasedGuides(user.id, supabase),
    getFollowedArtists(user.id),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white">Your NEYA</h1>
            <p className="mt-1 text-sm text-white/55">Reservations, tickets, travel guides, and saved nights.</p>
          </div>
          <SignOutButton variant="secondary" />
        </div>

        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/45">Travel guides</h2>
          <ul className="mt-3 space-y-2">
            {purchasedGuides.length ? (
              purchasedGuides.map((g) => (
                <li key={g.id} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm">
                  <Link href={`/guides/${g.slug}/view`} className="font-medium text-white hover:underline">
                    {g.title}
                  </Link>
                </li>
              ))
            ) : (
              <li className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-4 text-sm text-white/45">
                No guides yet —{" "}
                <Link href="/guides" className="text-sky-300 hover:underline">
                  explore Kosovo travel guides
                </Link>
                {" "}before your next night out.
              </li>
            )}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/45">Artists you follow</h2>
          <ul className="mt-3 space-y-2">
            {followedArtists.length ? (
              followedArtists.map((artist) => (
                <li
                  key={artist.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm"
                >
                  <Link href={`/artists/${artist.slug}`} className="font-medium text-white hover:underline">
                    {artist.name}
                  </Link>
                  {artist.genres.length ? (
                    <span className="text-xs text-white/45">{artist.genres.slice(0, 3).join(" · ")}</span>
                  ) : null}
                </li>
              ))
            ) : (
              <li className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-4 text-sm text-white/45">
                No artists followed yet — follow the DJs you like and their gigs land here.{" "}
                <Link href="/artists" className="text-sky-300 hover:underline">
                  Browse artists
                </Link>
              </li>
            )}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/45">Upcoming saved events</h2>
          <ul className="mt-3 space-y-2">
            {upcomingSaved.length ? (
              upcomingSaved.map((s) => {
                const ev = s.events as { slug?: string; title?: string; starts_at?: string } | null;
                return (
                  <li key={s.event_id} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm">
                    {ev?.slug ? (
                      <>
                        <Link href={`/events/${ev.slug}`} className="font-medium text-white hover:underline">
                          {ev?.title ?? "Event"}
                        </Link>
                        {ev?.starts_at ? <span className="ml-2 text-xs text-white/45">{new Date(ev.starts_at).toLocaleString()}</span> : null}
                      </>
                    ) : (
                      <span className="text-white/50">Event unavailable</span>
                    )}
                  </li>
                );
              })
            ) : (
              <li className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-4 text-sm text-white/45">
                No upcoming saved events — tap the bookmark on any event to keep it here.{" "}
                <Link href="/events" className="text-sky-300 hover:underline">
                  Browse tonight
                </Link>
              </li>
            )}
          </ul>
        </section>

        <section className="mt-10"><h2 className="text-sm font-semibold uppercase tracking-widest text-white/45">Saved venues</h2><ul className="mt-3 space-y-2">{savedVenues?.length ? savedVenues.map((item) => { const venue = item.venues as { slug?: string; name?: string; city_slug?: string } | null; return <li key={item.venue_id} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm">{venue?.slug ? <Link href={`/venues/${venue.slug}`} className="font-medium text-white hover:underline">{venue.name ?? "Venue"}</Link> : <span className="text-white/50">Venue unavailable</span>}{venue?.city_slug ? <span className="ml-2 text-xs capitalize text-white/45">{venue.city_slug.replace(/-/g, " ")}</span> : null}</li>; }) : <li className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-4 text-sm text-white/45">No saved venues yet — save a venue to keep its upcoming nights close.</li>}</ul></section>

        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/45">Guestlists</h2>
          <ul className="mt-3 space-y-2">
            {guestlistRequests?.length ? (
              guestlistRequests.map((g) => {
                const ev = g.events as { title?: string; slug?: string } | { title?: string; slug?: string }[] | null;
                const event = Array.isArray(ev) ? ev[0] : ev;
                return (
                  <li
                    key={g.id}
                    className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/80"
                  >
                    <span className="font-medium text-white">{event?.title ?? "Event"}</span> · party of {g.group_size}{" "}
                    · <span className="text-sky-200/90">{guestlistStatusLabel(g.status)}</span>
                    {event?.slug ? (
                      <Link href={`/events/${event.slug}`} className="ml-2 text-xs text-sky-300 hover:underline">
                        View
                      </Link>
                    ) : null}
                  </li>
                );
              })
            ) : guestlistEntries?.length ? (
              guestlistEntries.map((g) => {
                const gl = g.guestlists as { name?: string; events?: { title?: string; slug?: string } | null } | null;
                const ev = gl?.events;
                return (
                  <li
                    key={g.id}
                    className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/80"
                  >
                    <span className="font-medium text-white">{ev?.title ?? "Event"}</span> · {gl?.name ?? "List"} ·{" "}
                    <span className="text-sky-200/90">{guestlistStatusLabel(g.status)}</span>
                    {ev?.slug ? (
                      <Link href={`/events/${ev.slug}`} className="ml-2 text-xs text-sky-300 hover:underline">
                        View
                      </Link>
                    ) : null}
                  </li>
                );
              })
            ) : (
              <li className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-4 text-sm text-white/45">
                No guestlist requests yet — join one from any event page.{" "}
                <Link href="/events" className="text-sky-300 hover:underline">
                  Browse events
                </Link>
              </li>
            )}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/45">Table holds</h2>
          <ul className="mt-3 space-y-2">
            {reservations?.length ? (
              reservations.map((r) => (                  <li
                    key={r.id}
                    className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/80"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-white">
                        {(r.venues as { name?: string } | null)?.name ??
                          (r.events as { title?: string } | null)?.title ??
                          "Venue"}
                      </span>
                      <span className="text-xs text-white/40">{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                    {r.party_size} guests ·{" "}
                    <span className="text-sky-200/90">{reservationStatusLabel(r.status)}</span>
                  <span className="text-white/45">
                    {" "}
                    · {paymentMethodLabel(r.payment_method)} · {paymentStatusLabel(r.payment_status)}
                    {r.deposit_cents != null && r.deposit_cents > 0
                      ? ` · €${(r.deposit_cents / 100).toFixed(2)}`
                      : " · Free"}
                  </span>
                </li>
              ))
            ) : (
              <li className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-4 text-sm text-white/45">
                No table holds yet — reserve a table for tonight.{" "}
                <Link href="/events" className="text-sky-300 hover:underline">
                  Browse events
                </Link>
              </li>
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
                const paid = o.payment_status === "paid";
                return (
                  <li
                    key={o.id}
                    className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/80"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-white">{ev?.title ?? "Event"}</span>
                      <span className="text-xs text-white/40">{new Date(o.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="mt-1">
                      {t?.tier_name ?? "Ticket"} ·{" "}
                      <span className={paid ? "text-emerald-300/90" : "text-sky-200/90"}>
                        {o.payment_status === "paid" ? "Paid" : o.payment_status}
                      </span>
                      {ev?.slug ? (
                        <Link href={`/events/${ev.slug}`} className="ml-2 text-xs text-sky-300 hover:underline">
                          Event page
                        </Link>
                      ) : null}
                    </p>
                    {paid && o.qr_payload ? <TicketCode payload={o.qr_payload} /> : null}
                  </li>
                );
              })
            ) : (
              <li className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-4 text-sm text-white/45">
                No tickets yet — grab one for tonight.{" "}
                <Link href="/events" className="text-sky-300 hover:underline">
                  Browse events
                </Link>
              </li>
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
