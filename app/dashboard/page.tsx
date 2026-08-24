import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { createClient } from "@/lib/supabase/server";
import { SITE } from "@/lib/constants";
import { TicketCode } from "@/components/neya/ticket-code";
import { MyNightButton } from "@/components/my-night/my-night-button";
import { isOnDayOffset, isOnThisWeekend, isPast } from "@/lib/event-dates";
import { getUserPurchasedGuides } from "@/services/guides";
import { getFollowedArtists } from "@/services/artists";
import { guestlistStatusLabel } from "@/lib/guestlist/labels";
import { paymentMethodLabel, paymentStatusLabel, reservationStatusLabel } from "@/lib/reservations/labels";

export const metadata: Metadata = {
  title: `Your NEYA · ${SITE.name}`,
  robots: { index: false, follow: false },
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  const { data: profile } = await supabase.from("profiles").select("onboarding_complete, display_name, music_genres, interests").eq("id", user.id).maybeSingle();
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
    .select("id, status, payment_status, created_at, qr_payload, tickets(tier_name, events(title, slug, starts_at))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: saved } = await supabase
    .from("saved_events")
    .select("event_id, created_at, events(slug, title, starts_at, ends_at, image_url, venues(name, slug))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(40);

  const { data: savedVenues } = await supabase
    .from("saved_venues")
    .select("venue_id, created_at, venues(slug, name, city_slug, image_url, address, category)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(40);
  type SavedEventRow = {
    event_id: string;
    created_at: string;
    events:
      | { slug?: string; title?: string; starts_at?: string; ends_at?: string | null; image_url?: string | null; venues?: { name?: string; slug?: string } | { name?: string; slug?: string }[] | null }
      | { slug?: string; title?: string; starts_at?: string; ends_at?: string | null; image_url?: string | null; venues?: { name?: string; slug?: string } | { name?: string; slug?: string }[] | null }[]
      | null;
  };
  const savedEventRow = (item: SavedEventRow) => { const raw = item.events; return Array.isArray(raw) ? raw[0] : raw; };
  const savedEvents = (saved ?? []).map((item) => ({ item, event: savedEventRow(item) }));
  const savedGroup = (startsAt?: string, endsAt?: string | null): "tonight" | "weekend" | "upcoming" | "past" => {
    if (!startsAt) return "upcoming";
    if (isPast(startsAt, endsAt ?? undefined)) return "past";
    if (isOnDayOffset(startsAt, 0)) return "tonight";
    if (isOnThisWeekend(startsAt)) return "weekend";
    return "upcoming";
  };
  const savedByGroup = (group: "tonight" | "weekend" | "upcoming" | "past") =>
    savedEvents
      .filter(({ event }) => savedGroup(event?.starts_at, event?.ends_at) === group)
      .sort((a, b) => new Date(a.event?.starts_at ?? 0).getTime() - new Date(b.event?.starts_at ?? 0).getTime());
  const savedGroups = [
    { key: "tonight" as const, label: "Tonight" },
    { key: "weekend" as const, label: "This weekend" },
    { key: "upcoming" as const, label: "Upcoming" },
    { key: "past" as const, label: "Past" },
  ];
  const hasAnySaved = savedEvents.length > 0 || Boolean(savedVenues?.length);

  const [purchasedGuides, followedArtists] = await Promise.all([
    getUserPurchasedGuides(user.id, supabase),
    getFollowedArtists(user.id),
  ]);

  // Compute once on the server so the upcoming/past split is stable.
  // eslint-disable-next-line react-hooks/purity -- server component, runs once per request
  const nowMs = Date.now();

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white">
              {profile?.display_name ? profile.display_name.split(" ")[0] : "Your NEYA"}
            </h1>
            <p className="mt-1 text-sm text-white/55">Reservations, tickets, guides, and saved nights.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/preferences"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/70 transition hover:border-white/25 hover:text-white"
            >
              Preferences
            </Link>
            <SignOutButton variant="secondary" />
          </div>
        </div>

        {/* Quick stats */}
        <div className="mt-4 flex flex-wrap gap-3">
          {savedEvents.length > 0 ? (
            <Link href="/my-night" className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm transition hover:border-white/25">
              <span className="font-bold text-white">{savedEvents.length}</span>
              <span className="ml-1 text-white/50">saved</span>
            </Link>
          ) : null}
          {orders?.length ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm">
              <span className="font-bold text-white">{orders.length}</span>
              <span className="ml-1 text-white/50">tickets</span>
            </div>
          ) : null}
          {reservations?.length ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm">
              <span className="font-bold text-white">{reservations.length}</span>
              <span className="ml-1 text-white/50">reservations</span>
            </div>
          ) : null}
          {profile?.music_genres?.length ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm">
              <span className="font-bold text-white">{profile.music_genres.length}</span>
              <span className="ml-1 text-white/50">genres</span>
            </div>
          ) : null}
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
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-white/45">Saved</h2>
            <Link href="/my-night" className="text-xs font-semibold text-sky-300 hover:text-sky-200 hover:underline">
              Open My Night →
            </Link>
          </div>

          {!hasAnySaved ? (
            <p className="mt-3 rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-4 text-sm text-white/45">
              Nothing saved yet — tap the bookmark on any event or venue to keep it here.{" "}
              <Link href="/events" className="text-sky-300 hover:underline">Browse tonight</Link>
            </p>
          ) : null}

          {savedGroups.map((group) => {
            const rows = savedByGroup(group.key);
            if (!rows.length) return null;
            return (
              <div key={group.key} className="mt-6">
                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/60">
                  {group.label}
                  {group.key === "tonight" ? <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" /> : null}
                  <span className="text-white/30">· {rows.length}</span>
                </h3>
                <ul className="mt-3 space-y-2">
                  {rows.map(({ item, event: ev }) => (
                    <li key={item.event_id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm">
                      <div className="min-w-0">
                        {ev?.slug ? (
                          <Link href={`/events/${ev.slug}`} className="font-medium text-white hover:underline">
                            {ev?.title ?? "Event"}
                          </Link>
                        ) : (
                          <span className="text-white/50">Event unavailable</span>
                        )}
                        {ev?.starts_at ? (
                          <span className="ml-2 text-xs text-white/45">
                            {new Date(ev.starts_at).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        ) : null}
                        {ev?.venues ? (
                          <span className="ml-2 text-xs capitalize text-white/35">
                            {(Array.isArray(ev.venues) ? ev.venues[0] : ev.venues)?.name}
                          </span>
                        ) : null}
                      </div>
                      <MyNightButton
                        variant="default"
                        className="h-8 px-2.5 text-[11px]"
                        stop={{
                          stopId: "",
                          kind: "event",
                          refId: item.event_id,
                          title: ev?.title ?? "Event",
                          subtitle: (Array.isArray(ev?.venues) ? ev?.venues?.[0] : ev?.venues)?.name ?? null,
                          time: ev?.starts_at ?? null,
                          endsAt: ev?.ends_at ?? null,
                          image: ev?.image_url ?? null,
                          slug: ev?.slug ?? null,
                          lat: null,
                          lng: null,
                          available: Boolean(ev?.slug),
                        }}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          {savedVenues?.length ? (
            <div className="mt-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/60">Venues · {savedVenues.length}</h3>
              <ul className="mt-3 space-y-2">
                {savedVenues.map((item) => {
                  const venue = item.venues as { slug?: string; name?: string; city_slug?: string; address?: string; image_url?: string | null } | null;
                  return (
                    <li key={item.venue_id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm">
                      <div className="min-w-0">
                        {venue?.slug ? (
                          <Link href={`/venues/${venue.slug}`} className="font-medium text-white hover:underline">{venue.name ?? "Venue"}</Link>
                        ) : (
                          <span className="text-white/50">Venue unavailable</span>
                        )}
                        {venue?.city_slug ? <span className="ml-2 text-xs capitalize text-white/45">{venue.city_slug.replace(/-/g, " ")}</span> : null}
                      </div>
                      <MyNightButton
                        variant="default"
                        className="h-8 px-2.5 text-[11px]"
                        stop={{
                          stopId: "",
                          kind: "venue",
                          refId: item.venue_id,
                          title: venue?.name ?? "Venue",
                          subtitle: venue?.address ?? null,
                          time: null,
                          image: venue?.image_url ?? null,
                          slug: venue?.slug ?? null,
                          lat: null,
                          lng: null,
                          available: Boolean(venue?.slug),
                        }}
                      />
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </section>

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
          {orders?.length ? (
            (() => {
              const ticketOrders = orders.map((o) => {
                const t = o.tickets as { tier_name?: string; events?: { title?: string; slug?: string; starts_at?: string } | { title?: string; slug?: string; starts_at?: string }[] | null } | null;
                const evRaw = t?.events;
                const ev = Array.isArray(evRaw) ? evRaw[0] : evRaw;
                return { o, t, ev };
              });
              const upcoming = ticketOrders.filter(({ ev }) => ev?.starts_at ? new Date(ev.starts_at).getTime() >= nowMs : true);
              const past = ticketOrders.filter(({ ev }) => ev?.starts_at ? new Date(ev.starts_at).getTime() < nowMs : false);
              const ticketStatusBadge = (status: string) => {
                if (status === "paid") return <span className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-200">Paid</span>;
                if (status === "processing" || status === "pending") return <span className="inline-flex items-center rounded-full border border-sky-400/30 bg-sky-500/10 px-2 py-0.5 text-xs font-medium text-sky-200">Confirming</span>;
                if (status === "failed") return <span className="inline-flex items-center rounded-full border border-red-400/30 bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-200">Failed</span>;
                if (status === "cancelled") return <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-xs font-medium text-white/60">Cancelled</span>;
                if (status === "refunded") return <span className="inline-flex items-center rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-200">Refunded</span>;
                return <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-xs font-medium text-white/60">{status}</span>;
              };
              const renderOrder = ({ o, t, ev }: typeof ticketOrders[number]) => {
                const paid = o.payment_status === "paid";
                return (
                  <li key={o.id} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/80">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-white">{ev?.title ?? "Event"}</span>
                      {ticketStatusBadge(o.payment_status)}
                    </div>
                    <p className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="text-white/60">{t?.tier_name ?? "Ticket"}</span>
                      <span className="text-white/30">·</span>
                      <span className="text-xs text-white/40">{new Date(o.created_at).toLocaleDateString()}</span>
                      {ev?.slug ? (
                        <Link href={`/events/${ev.slug}`} className="ml-auto text-xs text-sky-300 hover:underline">
                          Event page
                        </Link>
                      ) : null}
                    </p>
                    {paid && o.qr_payload ? <TicketCode payload={o.qr_payload} /> : null}
                  </li>
                );
              };
              return (
                <div className="mt-3 space-y-5">
                  {upcoming.length ? (
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-white/60">Upcoming</h3>
                      <ul className="mt-2 space-y-2">{upcoming.map(renderOrder)}</ul>
                    </div>
                  ) : null}
                  {past.length ? (
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-white/40">Past</h3>
                      <ul className="mt-2 space-y-2">{past.map(renderOrder)}</ul>
                    </div>
                  ) : null}
                </div>
              );
            })()
          ) : (
            <ul className="mt-3 space-y-2">
              <li className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-4 text-sm text-white/45">
                No tickets yet — grab one for tonight.{" "}
                <Link href="/events" className="text-sky-300 hover:underline">
                  Browse events
                </Link>
              </li>
            </ul>
          )}
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
