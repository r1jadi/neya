import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/neya/empty-state";
import { EventCard } from "@/components/neya/event-card";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SITE } from "@/lib/constants";
import { CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { upcomingEvents } from "@/lib/event-filters";
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

type Props = { searchParams: Promise<{ error?: string; guestlist?: string }> };

export default async function EventsPage({ searchParams }: Props) {
  const q = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const allEvents = await getFeaturedEvents(supabase);
  const events = upcomingEvents(allEvents);
  let savedEventIds: string[] = [];
  if (user) {
    const { data } = await supabase.from("saved_events").select("event_id").eq("user_id", user.id).limit(400);
    savedEventIds = data?.map((r) => r.event_id) ?? [];
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <SiteHeader />
      <main className="flex-1 px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-300/90">Prishtina</p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold text-white sm:text-4xl">
            Upcoming events
          </h1>
          <p className="mt-2 max-w-xl text-sm text-white/55">
            What&apos;s on in Prishtina — sorted by date as venues publish new nights.
          </p>
          {q.error === "stripe" ? (
            <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
              Stripe is not configured or checkout failed. Check server env keys.
            </p>
          ) : null}
          {q.guestlist === "applied" ? (
            <p className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
              Guestlist request sent.
            </p>
          ) : null}
          {q.guestlist === "duplicate" ? (
            <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
              You are already on this guestlist.
            </p>
          ) : null}
          {events.length ? (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((e) => (
                <EventCard key={e.id} event={e} saved={savedEventIds.includes(e.id)} />
              ))}
            </div>
          ) : (
            <EmptyState
              className="mt-10"
              title="Events coming soon"
              description="No events are published yet. Venues will list their nights here when they go live."
              icon={<CalendarDays className="h-10 w-10" />}
            />
          )}
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
