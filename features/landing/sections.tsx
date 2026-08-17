import { ActivityStrip } from "@/components/neya/activity-strip";
import { StoryViewer } from "@/components/neya/story-viewer";
import { TrendingCarousel } from "@/components/neya/trending-carousel";
import { VenueCard } from "@/components/neya/venue-card";
import { AnimatedMap } from "@/components/neya/animated-map";
import { GlassCard } from "@/components/neya/glass-card";
import { EventCard } from "@/components/neya/event-card";
import { FomoTicker } from "@/components/neya/fomo-ticker";
import { ForYouRail } from "@/features/landing/for-you-rail";
import { VenueHighlightCard } from "@/components/neya/venue-highlight-card";
import { MyNightEntry } from "@/components/my-night/my-night-entry";
import { LandingHero } from "./hero";
import {
  djSets,
  hiddenGems,
  lastTablesLeft,
  liveNow,
  nearbyFirst,
  rooftopEvents,
  sortByAtmosphere,
  sortByCrowd,
  studentParties,
  thisWeekend,
  tonightEvents,
  upcomingEvents,
  uniqueBySlug,
} from "@/lib/event-filters";
import type { ActivityFeedItem } from "@/services/activity";
import type { Event, StoryItem, Venue, VenueHighlight } from "@/types";
import { EmptyState } from "@/components/neya/empty-state";
import { EVENT_CATEGORIES } from "@/lib/discovery";
import type { City } from "@/services/cities";
import Link from "next/link";
import { ArrowRight, CalendarDays, Compass, MapPin, Quote, Sparkles } from "lucide-react";

interface LandingSectionsProps {
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
  const students = studentParties(upcoming);
  const gems = hiddenGems(upcoming);
  const tables = lastTablesLeft(upcoming);
  const weekend = thisWeekend(events);
  const rising = sortByAtmosphere(upcoming).slice(0, 10);

  const highlightByVenue = new Map(
    highlights.map((h) => [h.venue_id, h] as const),
  );

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
  const discoverableCities = cities.filter((city) =>
    events.some((event) => (event.city_slug ?? event.venue?.city_slug) === city.slug) ||
    venues.some((venue) => venue.city_slug === city.slug),
  );

  const fomoLines = uniqueBySlug(events)
    .map((e) => e.fomo_line)
    .filter((x): x is string => Boolean(x));

  const hasEvents = events.length > 0;
  const hasVenues = venues.length > 0;

  return (
    <div className="flex w-full min-w-0 flex-1 flex-col">
      <LandingHero stats={heroStats} spotlight={spotlight} />

      <ActivityStrip items={activityItems} />

      {fomoLines.length ? (
        <section className="mx-auto w-full min-w-0 max-w-6xl space-y-3 px-4 pb-6 sm:px-6">
          <FomoTicker lines={fomoLines} />
        </section>
      ) : null}

      <MyNightEntry />

      <section className="mx-auto w-full min-w-0 max-w-6xl px-4 pb-12 sm:px-6">
        <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fuchsia-300/90">Find your night</p>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl font-bold text-white">Where should you go?</h2>
          </div>
          <nav aria-label="Quick event discovery" className="flex flex-wrap gap-2 text-sm">
            <Link href="/events?when=tonight" className="rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 py-1.5 font-medium text-fuchsia-100 transition hover:bg-fuchsia-500/20">Tonight</Link>
            <Link href="/events?when=weekend" className="rounded-full border border-white/15 px-3 py-1.5 font-medium text-white/75 transition hover:border-white/30 hover:text-white">This weekend</Link>
            <Link href="/events?when=upcoming" className="rounded-full border border-white/15 px-3 py-1.5 font-medium text-white/75 transition hover:border-white/30 hover:text-white">Upcoming</Link>
            <Link href="/map" className="rounded-full border border-white/15 px-3 py-1.5 font-medium text-white/75 transition hover:border-white/30 hover:text-white">Near me</Link>
          </nav>
        </div>
      </section>

      {musicGenres.length || venueInterests.length ? (
        <section className="mx-auto w-full min-w-0 max-w-6xl px-4 pb-10 sm:px-6">
          <ForYouRail
            events={events}
            musicGenres={musicGenres}
            venueInterests={venueInterests}
            savedEventIds={savedEventIds}
          />
        </section>
      ) : null}

      {stories.length ? (
        <section className="mx-auto w-full min-w-0 max-w-6xl space-y-4 px-4 pb-16 sm:px-6">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-white">Stories</h2>
          <StoryViewer stories={stories} />
        </section>
      ) : null}

      {highlights.length ? (
        <section className="mx-auto w-full min-w-0 max-w-6xl space-y-4 px-4 pb-16 sm:px-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-white">
                This week
              </h2>
              <p className="mt-1 text-sm text-white/55">
                Venue updates — specials, lineups and nights worth planning around.
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {highlights.map((h) => (
              <VenueHighlightCard key={h.id} highlight={h} />
            ))}
          </div>
        </section>
      ) : null}

      <div className="mx-auto w-full min-w-0 max-w-6xl space-y-16 px-4 pb-20 sm:px-6">
        {!hasEvents ? (
          <EmptyState
            title="Events coming soon"
            description="No public events are listed yet. Check back after venues publish their nights."
            icon={<CalendarDays className="h-10 w-10" />}
          />
        ) : (
          <>
        {tonight.length > 0 ? (
          <TrendingCarousel
            title="Tonight"
            subtitle="Happening in Prishtina tonight"
            events={trendingTonight}
            savedEventIds={savedEventIds}
          />
        ) : null}

        <TrendingCarousel
          title="Trending"
          subtitle="Featured nights and the next big plans"
          events={trendingUpcoming}
          savedEventIds={savedEventIds}
        />

        <TrendingCarousel
          title={tonight.length > 0 ? "Coming up" : "Upcoming events"}
          subtitle="Sorted by date — next nights on the calendar"
          events={trendingUpcoming}
          savedEventIds={savedEventIds}
        />

        {nearby.some((event) => event.distance_km != null) ? (
          <TrendingCarousel title="Nearby places" subtitle="Distance-aware picks" events={nearby} savedEventIds={savedEventIds} />
        ) : null}

        <TrendingCarousel
          title="Live right now"
          subtitle="Rooms reporting live energy"
          events={live}
          savedEventIds={savedEventIds}
        />

        <TrendingCarousel
          title="Rooftop events"
          subtitle="Skyline sessions"
          events={rooftops}
          savedEventIds={savedEventIds}
        />

        <TrendingCarousel
          title="DJ sets"
          subtitle="House · techno · afro"
          events={djs}
          savedEventIds={savedEventIds}
        />

        <TrendingCarousel
          title="Student parties"
          subtitle="Campus energy & open format"
          events={students}
          savedEventIds={savedEventIds}
        />

        <TrendingCarousel
          title="Hidden gems"
          subtitle="Underrated vibe, still elite"
          events={gems}
          savedEventIds={savedEventIds}
        />

        <TrendingCarousel
          title="Last tables left"
          subtitle="Reservation pressure"
          events={tables}
          savedEventIds={savedEventIds}
        />

        <TrendingCarousel
          title="This weekend"
          subtitle="Friday – Sunday in Prishtina"
          events={weekend}
          savedEventIds={savedEventIds}
        />

        <TrendingCarousel
          title="Rising atmosphere"
          subtitle="Highest live scores on the wire"
          events={rising}
          savedEventIds={savedEventIds}
        />
          </>
        )}

        {categories.length ? (
          <section className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white md:text-3xl">Browse by category</h2>
                <p className="mt-1 text-sm text-white/55">Start with the kind of night you want.</p>
              </div>
              <Link href="/events" className="hidden items-center gap-1 text-sm font-semibold text-sky-300 hover:text-sky-200 sm:inline-flex">All events <ArrowRight className="h-4 w-4" /></Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Link key={category.id} href={`/events?category=${encodeURIComponent(category.id)}`} className="rounded-full border border-white/15 bg-white/[0.03] px-3 py-2 text-sm font-medium text-white/80 transition hover:border-fuchsia-400/45 hover:bg-fuchsia-500/10 hover:text-white">
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
                <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white md:text-3xl">Explore by city</h2>
                <p className="mt-1 text-sm text-white/55">Only cities with NEYA venues or events are shown.</p>
              </div>
              <Link href="/cities/prishtina" className="hidden items-center gap-1 text-sm font-semibold text-sky-300 hover:text-sky-200 sm:inline-flex">Explore cities <ArrowRight className="h-4 w-4" /></Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {discoverableCities.map((city) => (
                <Link key={city.slug} href={`/cities/${city.slug}`} className="group rounded-2xl border border-white/10 bg-gradient-to-br from-violet-950/30 to-zinc-950 p-5 transition hover:border-fuchsia-400/40">
                  <Compass className="h-5 w-5 text-fuchsia-300" />
                  <p className="mt-5 text-lg font-semibold text-white">{city.name}</p>
                  <p className="mt-1 text-sm text-white/50">{city.country_name}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-sky-300">See what&apos;s on <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section id="venues" className="space-y-6">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white md:text-3xl">
              Discover venues
            </h2>
            <p className="mt-1 text-sm text-white/55">Prishtina-first. Rooftops, clubs, hidden rooms.</p>
          </div>
          {hasVenues ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {venues.map((v) => (
                <VenueCard
                  key={v.id}
                  venue={v}
                  highlightTitle={highlightByVenue.get(v.id)?.title}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No venues added yet"
              description="Approved venues will appear here once added in the admin CMS."
              icon={<MapPin className="h-10 w-10" />}
            />
          )}
        </section>

        <section id="map" className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white md:text-3xl">
                Live map
              </h2>
              <p className="text-sm text-white/55">Event and venue pins across the city.</p>
            </div>
            <Link href="/map" className="inline-flex items-center gap-1 text-sm font-semibold text-sky-300 hover:text-sky-200">Open discovery map <ArrowRight className="h-4 w-4" /></Link>
          </div>
          {mapMarkers.length ? (
            <AnimatedMap className="shadow-2xl" markers={mapMarkers} />
          ) : (
            <EmptyState
              title="Map waiting for venues"
              description="Add coordinates when creating a venue to show live pins on the map."
              icon={<MapPin className="h-10 w-10" />}
            />
          )}
        </section>

        {hasEvents ? (
          <section className="space-y-6">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white md:text-3xl">
              Upcoming events
            </h2>
            <div className="grid gap-6 lg:grid-cols-3">
              {upcoming.slice(0, 9).map((e) => (
                <EventCard key={e.id} event={e} saved={savedEventIds.includes(e.id)} />
              ))}
            </div>
          </section>
        ) : null}

        <section className="rounded-3xl border border-white/10 bg-gradient-to-r from-sky-950/35 via-zinc-950 to-fuchsia-950/25 p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">NEYA Guides</p>
              <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold text-white">Plan beyond one event</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/60">Explore local guides and event collections, then add the stops you like to My Night.</p>
            </div>
            <Link href="/guides" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90">Browse guides <Sparkles className="h-4 w-4" /></Link>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          {[
            {
              step: "01",
              title: "Pick your pulse",
              body: "Genres, venues, and live atmosphere — not generic listings.",
            },
            {
              step: "02",
              title: "Hold your spot",
              body: "Tables, guestlists, tickets. Secure deposits and QR flows via RaiAccept.",
            },
            {
              step: "03",
              title: "Show up legendary",
              body: "Real-time vibe, line estimates, and friend energy (opt-in).",
            },
          ].map((s) => (
            <GlassCard key={s.step} glow="purple">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300/90">{s.step}</p>
              <h3 className="mt-2 text-xl font-semibold text-white">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/60">{s.body}</p>
            </GlassCard>
          ))}
        </section>

        <section id="business" className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet-950/50 via-black to-sky-950/40 p-8 sm:p-12">
          <div className="max-w-2xl">
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold text-white sm:text-4xl">
              Own the night. Promote smarter.
            </h2>
            <p className="mt-4 text-base text-white/65">
              Featured placement, sponsored reach, reservations, guestlists, ticketing, and analytics — built for
              venues that want a premium dashboard, not a PDF flyer.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-white/70">
              <li>· Real conversions: clicks → holds → door</li>
              <li>· Payout tracking &amp; campaign ROI</li>
              <li>· Content: stories, reels, posters in-feed</li>
            </ul>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          {[
            {
              q: "NEYA feels like the city’s group chat — but beautiful.",
              who: "Promoter",
              org: "Prishtina",
            },
            {
              q: "We finally see who’s coming, when they spike, and what sells.",
              who: "Venue lead",
              org: "Rooftop",
            },
            {
              q: "I check it before I check Instagram.",
              who: "Regular",
              org: "Night owl",
            },
          ].map((t) => (
            <GlassCard key={t.q} glow="pink" className="flex flex-col justify-between">
              <Quote className="h-8 w-8 text-fuchsia-400/80" />
              <p className="mt-4 text-sm leading-relaxed text-white/75">&ldquo;{t.q}&rdquo;</p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-white/40">
                {t.who} · {t.org}
              </p>
            </GlassCard>
          ))}
        </section>

        <section className="flex flex-col items-center rounded-3xl border border-white/10 bg-zinc-950/60 py-14 text-center">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white sm:text-3xl">
            Apps coming later — the web is already live.
          </h2>
          <p className="mt-3 max-w-lg text-sm text-white/55">
            Mobile-first PWA experience tonight. Native apps when the city demands it.
          </p>
        </section>
      </div>
    </div>
  );
}
