import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { GuestlistRequestsPanel } from "@/components/admin/guestlist-requests-panel";
import { GuestlistRosterPanel } from "@/components/admin/guestlist-roster-panel";
import { requireVenueUser } from "@/lib/auth/require-venue";
import { adminErrorMessage } from "@/lib/admin/action-errors";
import { SITE } from "@/lib/constants";
import { getVenueWithEvents, listGuestlistRequestsForVenue } from "@/services/venue-portal";

export const metadata: Metadata = {
  title: `Guestlists · Venue portal · ${SITE.name}`,
};

type Props = { searchParams: Promise<{ ok?: string; error?: string; detail?: string }> };

export default async function VenueGuestlistsPage({ searchParams }: Props) {
  const q = await searchParams;
  const { venueId } = await requireVenueUser("/venue/guestlists");

  let requests: Awaited<ReturnType<typeof listGuestlistRequestsForVenue>> = [];
  let events: { id: string; title: string }[] = [];
  try {
    requests = await listGuestlistRequestsForVenue(venueId, 150);
    const { events: evs } = await getVenueWithEvents(venueId);
    events = evs.map((e) => ({ id: e.id, title: e.title }));
  } catch {
    requests = [];
  }

  const approvedRequests = requests.filter((r) => r.status === "approved" || r.status === "checked_in");

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white">Guestlists</h1>
      <p className="mt-2 text-sm text-white/55">Review and approve door requests for your events.</p>
      {q.ok ? <p className="mt-4 text-sm text-emerald-200/90">Updated.</p> : null}
      {q.error ? (
        <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {adminErrorMessage(q.error, q.detail)}
        </p>
      ) : null}

      <div className="mt-8 space-y-8">
        <Suspense fallback={<p className="text-sm text-white/45">Loading requests…</p>}>
          <GuestlistRequestsPanel
            variant="venue"
            requests={requests}
            events={events.map((e) => ({
            id: e.id,
            title: e.title,
            slug: "",
            description: null,
            venue_id: null,
            starts_at: "",
            ends_at: null,
            genre: null,
            image_url: null,
            lineup: [],
            capacity: null,
            is_featured: false,
            is_listed_public: true,
            is_hidden_premium: false,
            ticket_from_eur: null,
            reservation_price_eur: null,
            requires_online_payment: null,
            allows_pay_at_venue: null,
            venues: null,
          }))}
          />
        </Suspense>
        <GuestlistRosterPanel
          approvedRequests={approvedRequests}
          events={events.map((e) => ({
            id: e.id,
            title: e.title,
            slug: "",
            description: null,
            venue_id: null,
            starts_at: "",
            ends_at: null,
            genre: null,
            image_url: null,
            lineup: [],
            capacity: null,
            is_featured: false,
            is_listed_public: true,
            is_hidden_premium: false,
            ticket_from_eur: null,
            reservation_price_eur: null,
            requires_online_payment: null,
            allows_pay_at_venue: null,
            venues: null,
          }))}
        />
      </div>

      <p className="mt-10 text-center text-sm">
        <Link href="/venue" className="text-sky-300 hover:underline">
          Back to overview
        </Link>
      </p>
    </main>
  );
}
