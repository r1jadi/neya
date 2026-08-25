import type { Metadata } from "next";
import Link from "next/link";
import { PlacesDirectory } from "@/components/neya/places-directory";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SITE } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { getVenuesForCity } from "@/services/venues";
import { getDiscoveryEvents } from "@/services/events";
import { tonightEvents } from "@/lib/event-filters";
import { getDictionary } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: `Places · ${SITE.name}`,
  description: "Cafés, rooftops, galleries, pools and everything between — discover Prishtina places from the first coffee to last call.",
  openGraph: {
    title: `Places · ${SITE.name}`,
    description: "Day and night places on NEYA.",
    url: `${SITE.url}/places`,
    siteName: SITE.name,
  },
};

export default async function PlacesPage() {
  const t = await getDictionary();
  const supabase = await createClient();

  // All approved venues — places are city-agnostic (Prishtina today, more later).
  // `getVenuesForCity` without an argument loads every approved venue.
  const [venues, events] = await Promise.all([getVenuesForCity(), getDiscoveryEvents({}, supabase)]);

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
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-300/90">{t.places.eyebrow}</p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold text-white sm:text-4xl">
            {t.places.title}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-white/55">
            {t.places.description}
          </p>
          <PlacesDirectory venues={venues} tonightByVenue={tonightByVenue} savedVenueIds={savedVenueIds} />
          <p className="mt-12 text-center text-sm text-white/45">
            <Link href="/" className="text-sky-300 hover:underline">
              {t.places.backHome}
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}