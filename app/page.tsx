import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { LandingSections } from "@/features/landing/sections";
import { createClient } from "@/lib/supabase/server";
import { getRecentActivity } from "@/services/activity";
import { getFeaturedEvents } from "@/services/events";
import { getStoriesForCity } from "@/services/stories";
import { getVenues } from "@/services/venues";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [events, venues, stories, activityItems] = await Promise.all([
    getFeaturedEvents(supabase),
    getVenues(),
    getStoriesForCity("prishtina"),
    getRecentActivity(24),
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

  const hereNow = events.reduce((a, e) => a + e.crowd_count, 0);
  const tonightCount = events.length;
  const vibe =
    events.length > 0
      ? Math.round((events.reduce((a, e) => a + e.atmosphere_rating, 0) / events.length) * 10) / 10
      : 0;
  const spotlight = events.find((e) => e.is_featured) ?? events[0] ?? null;

  return (
    <div className="flex min-h-screen w-full min-w-0 flex-col">
      <SiteHeader />
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
      />
      <SiteFooter />
    </div>
  );
}
