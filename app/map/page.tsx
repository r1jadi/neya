import type { Metadata } from "next";
import { DiscoveryMap } from "@/components/neya/discovery-map";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SITE } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { getDiscoveryEvents } from "@/services/events";
import { getVenuesForCity } from "@/services/venues";

export const metadata: Metadata = { title: `Event map · ${SITE.name}`, description: "Find NEYA events and venues on the map." };
export default async function MapPage() { const supabase = await createClient(); const [events, venues] = await Promise.all([getDiscoveryEvents({}, supabase), getVenuesForCity()]); return <div className="flex min-h-screen flex-col bg-[var(--background)]"><SiteHeader /><main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-300/90">Map discovery</p><h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold text-white">Find the night on the map</h1><p className="mt-2 text-sm text-white/55">Toggle between events and venues, search by what you want, then search the part of the city you&apos;re viewing.</p><DiscoveryMap events={events} venues={venues} /></main><SiteFooter /></div>; }
