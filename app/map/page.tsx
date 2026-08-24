import type { Metadata } from "next";
import { DiscoveryMap } from "@/components/neya/discovery-map";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SITE } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { getDiscoveryEvents } from "@/services/events";
import { getVenuesForCity } from "@/services/venues";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionaries";

export const metadata: Metadata = {
  title: `Nightlife map · ${SITE.name}`,
  description: "Find what's live and what's happening around you in Prishtina — events and venues on the map.",
};

export default async function MapPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const locale = await getLocale();
  const t = getDictionary(locale);

  const [events, venues] = await Promise.all([getDiscoveryEvents({}, supabase), getVenuesForCity()]);

  let savedEventIds: string[] = [];
  if (user) {
    const { data } = await supabase.from("saved_events").select("event_id").eq("user_id", user.id).limit(400);
    savedEventIds = data?.map((r) => r.event_id) ?? [];
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-300/90">{t.mapPage.eyebrow}</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold text-white sm:text-4xl">
          {t.mapPage.title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-white/55">
          {t.mapPage.description}
        </p>
        <DiscoveryMap events={events} venues={venues} savedEventIds={savedEventIds} />
      </main>
      <SiteFooter />
    </div>
  );
}