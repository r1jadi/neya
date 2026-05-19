import type { Metadata } from "next";
import Link from "next/link";
import { requireVenueUser } from "@/lib/auth/require-venue";
import { SITE } from "@/lib/constants";
import { getVenuePortalStats, getVenueWithEvents } from "@/services/venue-portal";

export const metadata: Metadata = {
  title: `Venue portal · ${SITE.name}`,
};

type Props = { searchParams: Promise<{ error?: string }> };

export default async function VenuePortalPage({ searchParams }: Props) {
  const q = await searchParams;
  const { venueId } = await requireVenueUser("/venue");

  let venue: Awaited<ReturnType<typeof getVenueWithEvents>>["venue"] = null;
  let events: Awaited<ReturnType<typeof getVenueWithEvents>>["events"] = [];
  let stats = {
    reservationCount: 0,
    guestlistRequestCount: 0,
    pendingGuestlistCount: 0,
    upcomingEventCount: 0,
  };

  try {
    const data = await getVenueWithEvents(venueId);
    venue = data.venue;
    events = data.events;
    stats = await getVenuePortalStats(venueId);
  } catch {
    // service role missing in dev
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white">Venue portal</h1>
      <p className="mt-2 text-sm text-white/55">
        {venue?.name ?? "Your venue"} — manage guestlists and reservations for your events.
      </p>

      {q.error === "forbidden" ? (
        <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          This account does not have venue access. Contact NEYA support.
        </p>
      ) : null}

      <StatsGrid stats={stats} />

      <section className="mt-10 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-white/45">Your events</h2>
        {events.length ? (
          <ul className="space-y-2 text-sm">
            {events.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 px-3 py-2">
                <span className="font-medium text-white">{e.title}</span>
                <span className="text-xs text-white/45">
                  {e.is_listed_public ? "Public" : "Unlisted"} ·{" "}
                  <Link href={`/events/${e.slug}`} className="text-sky-300 hover:underline">
                    View
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-white/45">No events linked to this venue yet.</p>
        )}
      </section>

      <div className="mt-10 flex flex-wrap gap-3 text-sm">
        <Link href="/venue/guestlists" className="text-sky-300 hover:underline">
          Guestlists →
        </Link>
        <Link href="/venue/reservations" className="text-sky-300 hover:underline">
          Reservations →
        </Link>
      </div>
    </main>
  );
}

function StatsGrid({
  stats,
}: {
  stats: {
    reservationCount: number;
    guestlistRequestCount: number;
    pendingGuestlistCount: number;
    upcomingEventCount: number;
  };
}) {
  const cards = [
    { label: "Reservations", value: stats.reservationCount, href: "/venue/reservations" },
    { label: "Guestlist requests", value: stats.guestlistRequestCount, href: "/venue/guestlists" },
    { label: "Pending approvals", value: stats.pendingGuestlistCount, href: "/venue/guestlists" },
    { label: "Upcoming events", value: stats.upcomingEventCount, href: "/venue" },
  ];

  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2">
      {cards.map((c) => (
        <Link
          key={c.label}
          href={c.href}
          className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition hover:border-white/20"
        >
          <p className="text-3xl font-bold tabular-nums text-white">{c.value}</p>
          <p className="mt-2 text-xs uppercase tracking-wider text-white/45">{c.label}</p>
        </Link>
      ))}
    </div>
  );
}
