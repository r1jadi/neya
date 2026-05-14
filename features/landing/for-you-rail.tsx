import { TrendingCarousel } from "@/components/neya/trending-carousel";
import { matchGenres, uniqueBySlug } from "@/lib/event-filters";
import type { Event } from "@/types";

interface ForYouRailProps {
  events: Event[];
  musicGenres: string[];
  venueInterests: string[];
}

export function ForYouRail({ events, musicGenres, venueInterests }: ForYouRailProps) {
  const byMusic = matchGenres(events, musicGenres);
  const byVenue =
    venueInterests.length > 0
      ? events.filter((e) => venueInterests.map((x) => x.toLowerCase()).includes(e.venue.category))
      : [];
  const picks = uniqueBySlug([...byMusic, ...byVenue]).slice(0, 10);
  if (!picks.length) return null;
  return (
    <TrendingCarousel
      title="Picked for you"
      subtitle="Taste match from your genres & venue picks — full AI engine in Phase 4."
      events={picks}
    />
  );
}
