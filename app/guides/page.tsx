import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Compass } from "lucide-react";
import { GuideCard } from "@/components/neya/guide-card";
import { GuideFilters } from "@/components/neya/guides/guide-filters";
import { AiItineraryForm } from "@/components/neya/guides/ai-itinerary-form";
import { EmptyState } from "@/components/neya/empty-state";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SITE } from "@/lib/constants";
import { filterGuides, parseGuideSearchParams } from "@/lib/guide-filters";
import { createClient } from "@/lib/supabase/server";
import { getPublishedGuides } from "@/services/guides";

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

export default async function GuidesPage({ searchParams }: Props) {
  const q = await searchParams;
  const supabase = await createClient();
  const allGuides = await getPublishedGuides(supabase);
  const filters = parseGuideSearchParams(q);
  const guides = filterGuides(allGuides, filters);
  const featured = guides.filter((g) => g.featured);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <SiteHeader />
      <main className="flex-1 px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-300/90">NEYA Guides</p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold text-white sm:text-4xl">
            Explore Kosovo
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-white/55">
            Curated itineraries for tourists — from Prishtina day trips to multi-day Kosovo adventures.
            Purchase a guide for the full itinerary, transport tips, and interactive maps.
          </p>

          <div className="mt-8">
            <Suspense fallback={<div className="h-32 animate-pulse rounded-2xl bg-white/5" />}>
              <GuideFilters />
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
              <EmptyState
                className="mt-6"
                title="No guides match your filters"
                description="Try adjusting filters or check back soon — new guides are added regularly."
                icon={<Compass className="h-10 w-10" />}
              />
            )}
          </section>

          <section className="mt-16">
            <AiItineraryForm />
          </section>

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
