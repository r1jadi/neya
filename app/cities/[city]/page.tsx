import type { Metadata } from "next";
import Link from "next/link";
import { DiscoveryEventBrowser } from "@/components/neya/discovery-event-browser";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { createClient } from "@/lib/supabase/server";
import { getDiscoveryEvents } from "@/services/events";

export const metadata: Metadata = { title: "City events · NEYA", description: "Explore the live programme, venues and nights in your city." };

/** City hub reuses the canonical discovery data and the same event records. */
export default async function CityDiscoveryPage({ params }: PageProps<"/cities/[city]">) {
  const { city } = await params;
  const safeCity = city.toLowerCase().replace(/[^a-z0-9-]/g, "") || "prishtina";
  const supabase = await createClient();
  const [{ data: { user } }, events] = await Promise.all([supabase.auth.getUser(), getDiscoveryEvents({ city: safeCity }, supabase)]);
  let savedEventIds: string[] = [];
  if (user) { const { data } = await supabase.from("saved_events").select("event_id").eq("user_id", user.id).limit(400); savedEventIds = data?.map((row) => row.event_id) ?? []; }
  const name = safeCity.replace(/-/g, " ");
  return <div className="flex min-h-screen flex-col bg-[var(--background)]"><SiteHeader /><main className="flex-1 px-4 py-10 sm:px-6"><div className="mx-auto max-w-6xl"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-300/90">City programme</p><h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold capitalize text-white sm:text-4xl">{name}</h1><div className="mt-3 flex flex-wrap gap-3 text-sm text-white/55"><span>{events.length} upcoming events</span><Link href="/guides" className="text-sky-300 hover:underline">Local guides →</Link><Link href="/business" className="text-sky-300 hover:underline">Submit an event →</Link></div><DiscoveryEventBrowser events={events} savedEventIds={savedEventIds} city={name} /></div></main><SiteFooter /></div>;
}
