import type { Metadata } from "next";
import Link from "next/link";
import { DiscoveryEventBrowser } from "@/components/neya/discovery-event-browser";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SITE } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { getDiscoveryEvents } from "@/services/events";
import { getDictionary } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: `Discover events · ${SITE.name}`,
  description: "Discover nightlife, music and local experiences in Prishtina — tonight and beyond.",
  openGraph: {
    title: `Discover events · ${SITE.name}`,
    description: "Discover what’s happening in Prishtina.",
    url: `${SITE.url}/events`,
    siteName: SITE.name,
  },
};

type Props = { searchParams: Promise<{ city?: string; when?: string; category?: string; genre?: string; access?: string; error?: string; guestlist?: string }> };

export default async function EventsPage({ searchParams }: Props) {
  const t = await getDictionary();
  const q = await searchParams;
  const city = (q.city ?? "prishtina").toLowerCase().replace(/[^a-z0-9-]/g, "") || "prishtina";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const events = await getDiscoveryEvents({ city }, supabase);
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
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-300/90">{city}</p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold text-white sm:text-4xl">
            {t.eventsPage.title}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-white/55">
            {t.eventsPage.subtitle}
          </p>
          {q.error === "payment" ? (
            <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {t.eventsPage.paymentError}
            </p>
          ) : null}
          {q.guestlist === "applied" ? (
            <p className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
              {t.eventsPage.guestlistSent}
            </p>
          ) : null}
          {q.guestlist === "duplicate" ? (
            <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
              {t.eventsPage.guestlistDuplicate}
            </p>
          ) : null}
          <DiscoveryEventBrowser events={events} savedEventIds={savedEventIds} city={city} initialWindow={q.when} initialCategory={q.category} initialGenre={q.genre} initialAccess={q.access} />
          <p className="mt-12 text-center text-sm text-white/45">
            <Link href="/" className="text-sky-300 hover:underline">
              {t.eventsPage.backHome}
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
