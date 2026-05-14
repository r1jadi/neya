import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { LandingSections } from "@/features/landing/sections";
import { getFeaturedEvents } from "@/services/events";
import { getStoriesForCity } from "@/services/stories";
import { getVenues } from "@/services/venues";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const [events, venues, stories] = await Promise.all([
    getFeaturedEvents(),
    getVenues(),
    getStoriesForCity("prishtina"),
  ]);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let musicGenres: string[] = [];
  let venueInterests: string[] = [];
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("music_genres, interests")
      .eq("id", user.id)
      .maybeSingle();
    musicGenres = profile?.music_genres ?? [];
    venueInterests = profile?.interests ?? [];
  }

  const hereNow = events.reduce((a, e) => a + e.crowd_count, 0);
  const tonightCount = events.length;
  const vibe =
    events.length > 0 ? Math.round((events.reduce((a, e) => a + e.atmosphere_rating, 0) / events.length) * 10) / 10 : 9.2;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <LandingSections
        events={events}
        venues={venues}
        stories={stories}
        musicGenres={musicGenres}
        venueInterests={venueInterests}
        heroStats={{ hereNow, tonightCount, vibe }}
      />
      <SiteFooter />
    </div>
  );
}
