import type { Metadata } from "next";
import Link from "next/link";
import { VenueDirectory } from "@/components/neya/venue-directory";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SITE } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { getVenues } from "@/services/venues";
import { getDiscoveryEvents } from "@/services/events";
import { tonightEvents } from "@/lib/event-filters";

export const metadata: Metadata = {
  title: `Venues · ${SITE.name}`,
  description: "Rooftops, clubs, hidden rooms and live-music spots across Prishtina — see what's on before you go.",
  openGraph: {
    title: `Venues · ${SITE.name}`,
    description: "Discover Prishtina venues with NEYA.",
    url: `${SITE.url}/venues`,
    siteName: SITE.name,
  },
};

export default async function VenuesPage() {
  const supabase = await createClient();
  const [venues, events] = await Promise.all([getVenues(), getDiscoveryEvents({ city: "prishtina" }, supabase)]);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  let savedVenueIds: string[] = [];
  if (user) {
    const { data } = await supabase.from("saved_venues").select("venue_id").eq("user_id", user.id).limit(400);
    savedVenueIds = data?.map((row) => row.venue_id) ?? [];
  }

  // First upcoming event per venue, to surface "tonight" on venue cards.
  const tonightByVenue: Record<string, import("@/types").Event | null> = {};
  for (const event of [...tonightEvents(events), ...events]) {
    if (event.venue && !(event.venue.id in tonightByVenue)) tonightByVenue[event.venue.id] = event;
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <SiteHeader />
      <main className="flex-1 px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-300/90">Prishtina</p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold text-white sm:text-4xl">
            Venues
          </h1>
          <p className="mt-2 max-w-xl text-sm text-white/55">
            Rooftops, clubs, hidden rooms and live-music spots — see what&apos;s on before you go.
          </p>
          <VenueDirectory venues={venues} tonightByVenue={tonightByVenue} savedVenueIds={savedVenueIds} />
          <p className="mt-12 text-center text-sm text-white/45">
            <Link href="/" className="text-sky-300 hover:underline">
              ← Back home
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
