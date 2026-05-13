import type { Metadata } from "next";
import Link from "next/link";
import { EventCard } from "@/components/neya/event-card";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SITE } from "@/lib/constants";
import { getFeaturedEvents } from "@/services/events";

export const metadata: Metadata = {
  title: `Events tonight · ${SITE.name}`,
  description: "Events in Prishtina tonight — clubs, rooftops, live music, and student parties on NEYA.",
  openGraph: {
    title: `Events tonight · ${SITE.name}`,
    description: "Discover what’s happening tonight in Prishtina.",
    url: `${SITE.url}/events`,
    siteName: SITE.name,
  },
};

export default async function EventsPage() {
  const events = await getFeaturedEvents();

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <SiteHeader />
      <main className="flex-1 px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-300/90">Prishtina</p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold text-white sm:text-4xl">
            Tonight&apos;s lineup
          </h1>
          <p className="mt-2 max-w-xl text-sm text-white/55">
            Pulled from Supabase when your tables have data — otherwise demo content fills the feed.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
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
