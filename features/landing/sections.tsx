import { ActivityStrip } from "@/components/neya/activity-strip";
import { StoryViewer } from "@/components/neya/story-viewer";
import { TrendingCarousel } from "@/components/neya/trending-carousel";
import { VenueCard } from "@/components/neya/venue-card";
import { AnimatedMap } from "@/components/neya/animated-map";
import { GlassCard } from "@/components/neya/glass-card";
import { FomoTicker } from "@/components/neya/fomo-ticker";
import { ForYouRail } from "@/features/landing/for-you-rail";
import { VenueHighlightCard } from "@/components/neya/venue-highlight-card";
import { MyNightEntry } from "@/components/my-night/my-night-entry";
import { TonightTimeline } from "@/components/neya/tonight-timeline";
import { getTimeOfDay, timeOfDayCopy } from "@/lib/event-dates";
import { LandingHero } from "./hero";
import { HomeFeed } from "./home-feed";
import {
  djSets,
  liveNow,
  nearbyFirst,
  rooftopEvents,
  sortByCrowd,
  tonightEvents,
  upcomingEvents,
  uniqueBySlug,
} from "@/lib/event-filters";
import type { ActivityFeedItem } from "@/services/activity";
import type { Event, MusicGenre, StoryItem, Venue, VenueHighlight } from "@/types";
import { EmptyState } from "@/components/neya/empty-state";
import { EVENT_CATEGORIES } from "@/lib/discovery";
import type { City } from "@/services/cities";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";
import Link from "next/link";
import { ArrowRight, Compass, MapPin, Quote, Sparkles } from "lucide-react";

const LIVE_MUSIC_GENRES: MusicGenre[] = [
  "live_music",
  "jazz",
  "acoustic",
  "rock",
  "indie",
  "folk",
  "blues",
  "soul",
  "classical",
  "reggae",
  "world",
];

interface LandingSectionsProps {
  t: Dictionary;
  events: Event[];
  venues: Venue[];
  stories: StoryItem[];
  musicGenres: string[];
  venueInterests: string[];
  heroStats: { hereNow: number; tonightCount: number; vibe: number };
  activityItems: ActivityFeedItem[];
  savedEventIds: string[];
  spotlight?: Event | null;
  highlights: VenueHighlight[];
  cities: City[];
}

export function LandingSections({
  t,
  events,
  venues,
  stories,
  musicGenres,
  venueInterests,
  heroStats,
  activityItems,
  savedEventIds,
  spotlight,
  highlights,
  cities,
}: LandingSectionsProps) {
  const upcoming = upcomingEvents(events);
  const tonight = tonightEvents(events);
  const trendingTonight = sortByCrowd(tonight).slice(0, 14);
  const trendingUpcoming = sortByCrowd(upcoming).slice(0, 14);
  const nearby = nearbyFirst(upcoming).slice(0, 12);
  const live = liveNow(events);
  const rooftops = rooftopEvents(upcoming);
  const djs = djSets(upcoming);
  const liveMusic = upcoming.filter((event) => LIVE_MUSIC_GENRES.includes(event.genre));

  const highlightByVenue = new Map(highlights.map((h) => [h.venue_id, h] as const));

  const venueMarkers = venues
    .filter((v) => v.lat != null && v.lng != null && !Number.isNaN(v.lat) && !Number.isNaN(v.lng))
    .map((v) => ({
      lng: v.lng as number,
      lat: v.lat as number,
      slug: v.slug,
      title: v.name,
      is_live: v.is_live,
      kind: "venue" as const,
    }));
  const eventMarkers = upcoming
    .filter((event) => event.venue?.lat != null && event.venue?.lng != null)
    .slice(0, 80)
    .map((event) => ({
      lng: event.venue!.lng as number,
      lat: event.venue!.lat as number,
      slug: event.slug,
      title: event.title,
      is_live: event.live_status,
      kind: "event" as const,
    }));
  const mapMarkers = [...eventMarkers, ...venueMarkers];

  const categories = EVENT_CATEGORIES.map((category) => ({
    ...category,
    count: upcoming.filter((event) => event.category === category.id).length,
  })).filter((category) => category.count > 0);
  const discoverableCities = cities.filter(
    (city) =>
      events.some((event) => (event.city_slug ?? event.venue?.city_slug) === city.slug) ||
      venues.some((venue) => venue.city_slug === city.slug),
  );

  const fomoLines = uniqueBySlug(events)
    .map((e) => e.fomo_line)
    .filter((x): x is string => Boolean(x));

  const hasVenues = venues.length > 0;

  // Time-aware hero copy — computed here (server) so client hydration can't drift.
  const timeCopy = { ...timeOfDayCopy(), timeOfDay: getTimeOfDay() };

  // First upcoming event per venue, to surface "tonight" on venue cards.
  const tonightByVenue = new Map<string, Event>();
  for (const event of [...tonight, ...upcoming]) {
    if (event.venue && !tonightByVenue.has(event.venue.id)) tonightByVenue.set(event.venue.id, event);
  }

  return (
    <div className="flex w-full min-w-0 flex-1 flex-col">
      <LandingHero stats={heroStats} spotlight={spotlight} timeCopy={timeCopy} />

      {/* MAIN LIVE FEED — the first thing after the hero */}
      <div className="pb-14">
        <HomeFeed events={events} savedEventIds={savedEventIds} hasVenues={hasVenues} />
        <div className="mx-auto mt-10 w-full min-w-0 max-w-6xl px-4 sm:px-6">
          <TonightTimeline events={events} />
        </div>
      </div>

      {activityItems.length ? (
        <div className="pb-14">
          <ActivityStrip items={activityItems} />
        </div>
      ) : null}

      {fomoLines.length ? (
        <section className="mx-auto w-full min-w-0 max-w-6xl px-4 pb-14 sm:px-6">
          <FomoTicker lines={fomoLines} />
        </section>
      ) : null}

      {/* Horizontal discovery rails — only rendered when they have real content */}
      <div className="mx-auto w-full min-w-0 max-w-6xl space-y-14 px-4 pb-14 sm:px-6">
        {trendingTonight.length ? (
          <TrendingCarousel
            title={t.landing.trendingTonight}
            subtitle={t.landing.trendingTonightSub}
            events={trendingTonight}
            savedEventIds={savedEventIds}
            viewAllHref="/events?when=tonight"
          />
        ) : trendingUpcoming.length ? (
          <TrendingCarousel
            title={t.landing.trending}
            subtitle={t.landing.trendingSub}
            events={trendingUpcoming}
            savedEventIds={savedEventIds}
            viewAllHref="/events"
          />
        ) : null}

        {djs.length ? (
          <TrendingCarousel
            title={t.landing.electronic}
            subtitle={t.landing.electronicSub}
            events={djs}
            savedEventIds={savedEventIds}
            viewAllHref="/events?category=dj_set"
          />
        ) : null}

        {liveMusic.length ? (
          <TrendingCarousel
            title={t.landing.liveMusic}
            subtitle={t.landing.liveMusicSub}
            events={liveMusic}
            savedEventIds={savedEventIds}
            viewAllHref="/events?category=live_music"
          />
        ) : null}

        {rooftops.length ? (
          <TrendingCarousel
            title={t.landing.rooftops}
            subtitle={t.landing.rooftopsSub}
            events={rooftops}
            savedEventIds={savedEventIds}
            viewAllHref="/venues"
          />
        ) : null}

        {nearby.some((event) => event.distance_km != null) ? (
          <TrendingCarousel title={t.landing.nearby} subtitle={t.landing.nearbySub} events={nearby} savedEventIds={savedEventIds} />
        ) : null}

        {live.length ? (
          <TrendingCarousel
            title={t.landing.liveNow}
            subtitle={t.landing.liveNowSub}
            events={live}
            savedEventIds={savedEventIds}
          />
        ) : null}
      </div>

      {musicGenres.length || venueInterests.length ? (
        <section className="mx-auto w-full min-w-0 max-w-6xl px-4 pb-14 sm:px-6">
          <ForYouRail t={t} events={events} musicGenres={musicGenres} venueInterests={venueInterests} savedEventIds={savedEventIds} />
        </section>
      ) : null}

      <MyNightEntry />

      {stories.length ? (
        <section className="mx-auto w-full min-w-0 max-w-6xl space-y-4 px-4 pb-14 sm:px-6">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-white">{t.landing.stories}</h2>
          <StoryViewer stories={stories} />
        </section>
      ) : null}

      {highlights.length ? (
        <section className="mx-auto w-full min-w-0 max-w-6xl space-y-4 px-4 pb-14 sm:px-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-white">{t.landing.thisWeek}</h2>
              <p className="mt-1 text-sm text-white/55">{t.landing.thisWeekSub}</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {highlights.map((h) => (
              <VenueHighlightCard key={h.id} highlight={h} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Venues — pushed below events but still active destinations */}
      <div className="mx-auto w-full min-w-0 max-w-6xl space-y-16 px-4 pb-20 sm:px-6">
        <section id="venues" className="space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white md:text-3xl">{t.landing.venuesTonight}</h2>
              <p className="mt-1 text-sm text-white/55">{t.landing.venuesTonightSub}</p>
            </div>
            <Link href="/venues" className="inline-flex items-center gap-1 text-sm font-semibold text-sky-300 hover:text-sky-200">
              {t.landing.allVenues} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {hasVenues ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {venues.map((v) => (
                <VenueCard
                  key={v.id}
                  venue={v}
                  highlightTitle={highlightByVenue.get(v.id)?.title}
                  tonight={tonightByVenue.get(v.id) ?? null}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title={t.landing.noVenuesYet}
              description={t.landing.noVenuesYetDesc}
              icon={<MapPin className="h-10 w-10" />}
            />
          )}
        </section>

        <section id="map" className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white md:text-3xl">{t.landing.liveMap}</h2>
              <p className="text-sm text-white/55">{t.landing.liveMapSub}</p>
            </div>
            <Link href="/map" className="inline-flex items-center gap-1 text-sm font-semibold text-sky-300 hover:text-sky-200">
              {t.landing.openDiscoveryMap} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {mapMarkers.length ? (
            <AnimatedMap className="shadow-2xl" markers={mapMarkers} />
          ) : (
            <EmptyState
              title={t.landing.mapWaiting}
              description={t.landing.mapWaitingDesc}
              icon={<MapPin className="h-10 w-10" />}
            />
          )}
        </section>

        {categories.length ? (
          <section className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white md:text-3xl">{t.landing.browseByCategory}</h2>
                <p className="mt-1 text-sm text-white/55">{t.landing.browseByCategorySub}</p>
              </div>
              <Link href="/events" className="hidden items-center gap-1 text-sm font-semibold text-sky-300 hover:text-sky-200 sm:inline-flex">
                {t.landing.allEvents} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/events?category=${encodeURIComponent(category.id)}`}
                  className="rounded-full border border-white/15 bg-white/[0.03] px-3 py-2 text-sm font-medium text-white/80 transition hover:border-fuchsia-400/45 hover:bg-fuchsia-500/10 hover:text-white"
                >
                  {category.label} <span className="text-white/40">{category.count}</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {discoverableCities.length ? (
          <section className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white md:text-3xl">{t.landing.exploreByCity}</h2>
                <p className="mt-1 text-sm text-white/55">{t.landing.exploreByCitySub}</p>
              </div>
              <Link
                href="/cities/prishtina"
                className="hidden items-center gap-1 text-sm font-semibold text-sky-300 hover:text-sky-200 sm:inline-flex"
              >
                {t.landing.exploreCities} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {discoverableCities.map((city) => (
                <Link
                  key={city.slug}
                  href={`/cities/${city.slug}`}
                  className="group rounded-2xl border border-white/10 bg-gradient-to-br from-violet-950/30 to-zinc-950 p-5 transition hover:border-fuchsia-400/40"
                >
                  <Compass className="h-5 w-5 text-fuchsia-300" />
                  <p className="mt-5 text-lg font-semibold text-white">{city.name}</p>
                  <p className="mt-1 text-sm text-white/50">{city.country_name}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-sky-300">
                    {t.landing.seeWhatsOn} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className="rounded-3xl border border-white/10 bg-gradient-to-r from-sky-950/35 via-zinc-950 to-fuchsia-950/25 p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">{t.landing.guidesEyebrow}</p>
              <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold text-white">{t.landing.planBeyond}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/60">
                {t.landing.planBeyondDesc}
              </p>
            </div>
            <Link
              href="/guides"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90"
            >
              {t.landing.browseGuides} <Sparkles className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          {[
            { step: "01", title: t.landing.step1Title, body: t.landing.step1Body },
            {
              step: "02",
              title: t.landing.step2Title,
              body: t.landing.step2Body,
            },
            { step: "03", title: t.landing.step3Title, body: t.landing.step3Body },
          ].map((s) => (
            <GlassCard key={s.step} glow="purple">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300/90">{s.step}</p>
              <h3 className="mt-2 text-xl font-semibold text-white">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/60">{s.body}</p>
            </GlassCard>
          ))}
        </section>

        <section
          id="business"
          className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet-950/50 via-black to-sky-950/40 p-8 sm:p-12"
        >
          <div className="max-w-2xl">
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold text-white sm:text-4xl">
              {t.landing.businessTitle}
            </h2>
            <p className="mt-4 text-base text-white/65">
              {t.landing.businessDesc}
            </p>
            <ul className="mt-6 space-y-2 text-sm text-white/70">
              <li>{t.landing.businessPoint1}</li>
              <li>{t.landing.businessPoint2}</li>
              <li>{t.landing.businessPoint3}</li>
            </ul>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          {[
            { q: t.landing.quote1, who: t.landing.quote1Who, org: t.landing.quoteKosovoCity },
            { q: t.landing.quote2, who: t.landing.quote2Who, org: t.landing.quoteKosovoCity },
            { q: t.landing.quote3, who: t.landing.quote3Who, org: t.landing.quoteKosovoCity },
          ].map((quote) => (
            <GlassCard key={quote.q} glow="pink" className="flex flex-col justify-between">
              <Quote className="h-8 w-8 text-fuchsia-400/80" />
              <p className="mt-4 text-sm leading-relaxed text-white/75">&ldquo;{quote.q}&rdquo;</p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-white/40">
                {quote.who} · {quote.org}
              </p>
            </GlassCard>
          ))}
        </section>

        <section className="flex flex-col items-center rounded-3xl border border-white/10 bg-zinc-950/60 py-14 text-center">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white sm:text-3xl">
            {t.landing.appsSoon}
          </h2>
          <p className="mt-3 max-w-lg text-sm text-white/55">
            {t.landing.appsSoonDesc}
          </p>
        </section>
      </div>
    </div>
  );
}