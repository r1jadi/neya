import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { LandingSections } from "@/features/landing/sections";
import { createClient } from "@/lib/supabase/server";
import { getRecentActivity } from "@/services/activity";
import { getDiscoveryEvents } from "@/services/events";
import { getStoriesForCity } from "@/services/stories";
import { happeningNowEvents, tonightEvents, upcomingEvents } from "@/lib/event-filters";
import { getVenues } from "@/services/venues";
import { getActiveHighlightsForHome } from "@/services/venue-highlights";
import { getActiveCities } from "@/services/cities";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function Home({ searchParams }: Props) {
  const q = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [events, venues, stories, activityItems, highlights, cities] = await Promise.all([
    getDiscoveryEvents({}, supabase),
    getVenues(),
    getStoriesForCity("prishtina"),
    getRecentActivity(24),
    getActiveHighlightsForHome(6),
    getActiveCities(),
  ]);

  let musicGenres: string[] = [];
  let venueInterests: string[] = [];
  let savedEventIds: string[] = [];
  if (user) {
    const [prof, saved] = await Promise.all([
      supabase.from("profiles").select("music_genres, interests").eq("id", user.id).maybeSingle(),
      supabase.from("saved_events").select("event_id").eq("user_id", user.id).limit(400),
    ]);
    musicGenres = prof.data?.music_genres ?? [];
    venueInterests = prof.data?.interests ?? [];
    savedEventIds = saved.data?.map((r) => r.event_id) ?? [];
  }

  const upcoming = upcomingEvents(events);
  const tonight = tonightEvents(events);
  const liveNow = happeningNowEvents(events);

  const hereNow = liveNow.reduce((a, e) => a + e.crowd_count, 0);
  const tonightCount = tonight.length;
  const vibeSource = tonight.length > 0 ? tonight : upcoming;
  const vibe =
    vibeSource.length > 0
      ? Math.round((vibeSource.reduce((a, e) => a + e.atmosphere_rating, 0) / vibeSource.length) * 10) / 10
      : 0;
  const spotlight =
    upcoming.find((e) => e.is_featured) ??
    tonight.find((e) => e.is_featured) ??
    upcoming[0] ??
    null;

  return (
    <div className="flex min-h-screen w-full min-w-0 flex-col">
      <SiteHeader />
      {q.error === "payment" ? (
        <p className="mx-auto mt-6 w-full max-w-6xl rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          We couldn&apos;t start the payment — please try again from the event page.
        </p>
      ) : null}
      <LandingSections
        events={events}
        venues={venues}
        stories={stories}
        musicGenres={musicGenres}
        venueInterests={venueInterests}
        heroStats={{ hereNow, tonightCount, vibe }}
        activityItems={activityItems}
        savedEventIds={savedEventIds}
        spotlight={spotlight}
        highlights={highlights}
        cities={cities}
      />
      <SiteFooter />
    </div>
  );
}
