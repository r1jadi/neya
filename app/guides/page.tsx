import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Compass, MapPin } from "lucide-react";
import { GuideCard } from "@/components/neya/guide-card";
import { GuideFilters } from "@/components/neya/guides/guide-filters";
import { EditorialEventGuides } from "@/components/neya/guides/editorial-event-guides";
import { AiItineraryForm } from "@/components/neya/guides/ai-itinerary-form";
import { EmptyState } from "@/components/neya/empty-state";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SITE } from "@/lib/constants";
import { filterGuides, parseGuideSearchParams } from "@/lib/guide-filters";
import { createClient } from "@/lib/supabase/server";
import { getPublishedGuides } from "@/services/guides";
import { getDiscoveryEvents } from "@/services/events";
import type { GuideCategory } from "@/types/guides";

export const metadata: Metadata = {
  title: `Travel Guides · ${SITE.name}`,
  description: "Curated Kosovo travel guides — Prishtina, Prizren, Peja, and beyond. Day trips, multi-day itineraries, and insider tips.",
  openGraph: {
    title: `Travel Guides · ${SITE.name}`,
    description: "Discover Kosovo with NEYA travel guides.",
    url: `${SITE.url}/guides`,
    siteName: SITE.name,
  },
};

type Props = {
  searchParams: Promise<Record<string, string | undefined>>;
};

/** Intent chips link straight into the existing event discovery filters. */
const INTENTS = [
  { label: "🔥 Party", href: "/events?category=nightlife" },
  { label: "🎧 Techno", href: "/events?genre=techno" },
  { label: "🎤 Live music", href: "/events?category=live_music" },
  { label: "💸 Free", href: "/events?access=free" },
  { label: "🌅 Rooftops", href: "/map" },
  { label: "🗓 This weekend", href: "/events?when=weekend" },
];

export default async function GuidesPage({ searchParams }: Props) {
  const q = await searchParams;
  const supabase = await createClient();
  const [allGuides, events] = await Promise.all([getPublishedGuides(supabase), getDiscoveryEvents({ city: "prishtina" }, supabase)]);
  const { data: { user } } = await supabase.auth.getUser();
  const savedEventIds = user ? (await supabase.from("saved_events").select("event_id").eq("user_id", user.id).limit(400)).data?.map((row) => row.event_id) ?? [] : [];
  const filters = parseGuideSearchParams(q);
  const guides = filterGuides(allGuides, filters);
  const featured = guides.filter((g) => g.featured);

  const availableCategories = [...new Set(allGuides.flatMap((g) => g.categories))] as GuideCategory[];
  const locations = [...new Set(allGuides.map((g) => g.location_name).filter((l): l is string => Boolean(l)))];
  const maxPrice = Math.max(0, ...allGuides.map((g) => g.price));

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <SiteHeader />
      <main className="flex-1 px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-6xl">
          {/* Editorial hero */}
          <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet-950/40 via-zinc-950 to-fuchsia-950/25 px-6 py-12 sm:px-10 sm:py-16">
            <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-fuchsia-600/20 blur-[110px]" />
            <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-sky-600/15 blur-[100px]" />
            <div className="relative max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-300/90">NEYA Guides</p>
              <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-bold leading-tight text-white sm:text-5xl">
                Explore Kosovo
              </h1>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-white/60">
                Discover places, experiences, nightlife and things worth doing — curated itineraries for
                everything from a single night in Prishtina to a full Kosovo adventure.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-2">
                {INTENTS.map((intent) => (
                  <Link
                    key={intent.label}
                    href={intent.href}
                    className="rounded-full border border-white/15 bg-white/[0.03] px-3.5 py-2 text-sm font-medium text-white/75 transition hover:border-fuchsia-400/45 hover:bg-fuchsia-500/10 hover:text-white"
                  >
                    {intent.label}
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* Real stats */}
          {allGuides.length ? (
            <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <dt className="text-[11px] uppercase tracking-widest text-white/40">Guides</dt>
                <dd className="mt-1 text-2xl font-bold text-white">{allGuides.length}</dd>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <dt className="text-[11px] uppercase tracking-widest text-white/40">Categories</dt>
                <dd className="mt-1 text-2xl font-bold text-white">{availableCategories.length || "—"}</dd>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <dt className="text-[11px] uppercase tracking-widest text-white/40">Destinations</dt>
                <dd className="mt-1 text-2xl font-bold text-white">{locations.length || "—"}</dd>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <dt className="text-[11px] uppercase tracking-widest text-white/40">From</dt>
                <dd className="mt-1 text-2xl font-bold text-white">{maxPrice > 0 ? `€${Math.min(...allGuides.map((g) => g.price))}` : "Free"}</dd>
              </div>
            </dl>
          ) : null}

          {/* Filters */}
          <div className="mt-10">
            <Suspense fallback={<div className="h-32 animate-pulse rounded-2xl bg-white/5" />}>
              <GuideFilters availableCategories={availableCategories} />
            </Suspense>
          </div>

          {featured.length > 0 && !filters.featured ? (
            <section className="mt-10">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-white/45">Featured</h2>
              <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {featured.slice(0, 3).map((g) => (
                  <GuideCard key={g.id} guide={g} />
                ))}
              </div>
            </section>
          ) : null}

          <section className="mt-10">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white/45">
              {guides.length} guide{guides.length === 1 ? "" : "s"}
            </h2>
            {guides.length ? (
              <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {guides.map((g) => (
                  <GuideCard key={g.id} guide={g} />
                ))}
              </div>
            ) : (
              <div className="mt-6 flex flex-col items-center">
                <EmptyState
                  title="No guides match your filters"
                  description="Try a different category or clear the filters — new guides are added regularly."
                  icon={<Compass className="h-10 w-10" />}
                />
                <Link
                  href="/guides"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
                >
                  <MapPin className="h-4 w-4" />
                  Clear filters
                </Link>
              </div>
            )}
          </section>

          {/* Build your trip — core product experience */}
          <section className="mt-16">
            <AiItineraryForm />
          </section>

          <EditorialEventGuides events={events} savedEventIds={savedEventIds} nowIso={new Date().toISOString()} />

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
