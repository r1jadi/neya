import { TrendingCarousel } from "@/components/neya/trending-carousel";
import { matchGenres, uniqueBySlug } from "@/lib/event-filters";
import { MUSIC_GENRES, VENUE_CATEGORIES } from "@/types";
import type { Event } from "@/types";

interface ForYouRailProps {
  events: Event[];
  musicGenres: string[];
  venueInterests: string[];
  savedEventIds?: string[];
}

export function ForYouRail({ events, musicGenres, venueInterests, savedEventIds }: ForYouRailProps) {
  const byMusic = matchGenres(events, musicGenres);
  const byVenue =
    venueInterests.length > 0
      ? events.filter((e) => e.venue && venueInterests.map((x) => x.toLowerCase()).includes(e.venue.category))
      : [];
  const picks = uniqueBySlug([...byMusic, ...byVenue]).slice(0, 10);
  if (!picks.length) return null;
  const genreLabels = musicGenres.slice(0, 3).map((g) => {
    const match = MUSIC_GENRES.find((m) => m.id === g);
    return match?.label ?? g;
  });
  const venueLabels = venueInterests.slice(0, 2).map((v) => {
    const match = VENUE_CATEGORIES.find((c) => c.id === v);
    return match?.label ?? v;
  });
  const labels = [...genreLabels, ...venueLabels];
  const subtitle = labels.length
    ? `Because you like ${labels.slice(0, 3).join(" · ")}`
    : "Based on your taste";

  return (
    <TrendingCarousel
      title="✨ Picked for you"
      subtitle={subtitle}
      events={picks}
      savedEventIds={savedEventIds}
    />
  );
}
