import { StoryViewer } from "@/components/neya/story-viewer";
import { TrendingCarousel } from "@/components/neya/trending-carousel";
import { VenueCard } from "@/components/neya/venue-card";
import { AnimatedMap } from "@/components/neya/animated-map";
import { GlassCard } from "@/components/neya/glass-card";
import { TicketCard } from "@/components/neya/ticket-card";
import { EventCard } from "@/components/neya/event-card";
import { MOCK_EVENTS, MOCK_STORIES, MOCK_VENUES } from "@/data/mock-data";
import { LandingHero } from "./hero";
import { Quote } from "lucide-react";

export function LandingSections() {
  const trending = MOCK_EVENTS;
  const weekend = [...MOCK_EVENTS].reverse();

  return (
    <>
      <LandingHero />

      <section className="mx-auto max-w-6xl space-y-4 px-4 pb-16 sm:px-6">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-white">Stories</h2>
        <StoryViewer stories={MOCK_STORIES} />
      </section>

      <div className="mx-auto max-w-6xl space-y-16 px-4 pb-20 sm:px-6">
        <TrendingCarousel title="Trending tonight" subtitle="Most viewed in the last 60 minutes" events={trending} />

        <section id="venues" className="space-y-6">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white md:text-3xl">
              Discover venues
            </h2>
            <p className="mt-1 text-sm text-white/55">Prishtina-first. Rooftops, clubs, hidden rooms.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MOCK_VENUES.map((v) => (
              <VenueCard key={v.id} venue={v} />
            ))}
          </div>
        </section>

        <section id="map" className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white md:text-3xl">
                Live map
              </h2>
              <p className="text-sm text-white/55">Heat, pins, clusters — see where the night moves.</p>
            </div>
          </div>
          <AnimatedMap className="shadow-2xl" />
        </section>

        <section className="space-y-6">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white md:text-3xl">
            Upcoming events
          </h2>
          <div className="grid gap-6 lg:grid-cols-3">
            {weekend.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          {[
            { step: "01", title: "Pick your pulse", body: "Genres, venues, and live atmosphere — not generic listings." },
            { step: "02", title: "Hold your spot", body: "Tables, guestlists, tickets. Deposits and QR flows via Stripe." },
            { step: "03", title: "Show up legendary", body: "Real-time vibe, line estimates, and friend energy (opt-in)." },
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
          <div className="mt-8 w-full max-w-sm">
            <TicketCard eventTitle="NEYA Launch Week" tier="Early access" priceEur={0} endsAt="soon" />
          </div>
        </section>
      </div>
    </>
  );
}
