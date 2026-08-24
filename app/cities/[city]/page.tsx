import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DiscoveryEventBrowser } from "@/components/neya/discovery-event-browser";
import { AnimatedMap } from "@/components/neya/animated-map";
import { VenueCard } from "@/components/neya/venue-card";
import { GuideCard } from "@/components/neya/guide-card";
import { EmptyState } from "@/components/neya/empty-state";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { createClient } from "@/lib/supabase/server";
import { getDiscoveryEvents } from "@/services/events";
import { getVenuesForCity } from "@/services/venues";
import { getPublishedGuides } from "@/services/guides";
import { getCity } from "@/services/cities";
import { CalendarDays, MapPinned } from "lucide-react";
import { DiscoveryTracker } from "@/components/neya/discovery-tracker";
import { SITE } from "@/lib/constants";
import { getDictionary } from "@/lib/i18n/server";

type CityMetadataProps = { params: Promise<{ city: string }> };

export async function generateMetadata({ params }: CityMetadataProps): Promise<Metadata> {
  const { city } = await params;
  const safeCity = city.toLowerCase().replace(/[^a-z0-9-]/g, "");
  const cityRecord = await getCity(safeCity);
  if (!cityRecord) return { title: `City events · ${SITE.name}`, description: "Explore the live programme, venues and nights in your city." };
  const description = `Discover verified upcoming events, venues and nightlife in ${cityRecord.name}, ${cityRecord.country_name}.`;
  return { title: `${cityRecord.name} events · ${SITE.name}`, description, openGraph: { title: `${cityRecord.name} events`, description } };
}

/** City hub reuses the canonical discovery data and the same event records. */
export default async function CityDiscoveryPage({ params }: PageProps<"/cities/[city]">) {
  const t = await getDictionary();
  const { city } = await params;
  const safeCity = city.toLowerCase().replace(/[^a-z0-9-]/g, "") || "prishtina";
  const supabase = await createClient();
  const [{ data: { user } }, events, venues, cityRecord, allGuides] = await Promise.all([
    supabase.auth.getUser(), getDiscoveryEvents({ city: safeCity }, supabase), getVenuesForCity(safeCity), getCity(safeCity), getPublishedGuides(supabase),
  ]);
  let savedEventIds: string[] = [];
  if (user) { const { data } = await supabase.from("saved_events").select("event_id").eq("user_id", user.id).limit(400); savedEventIds = data?.map((row) => row.event_id) ?? []; }
  const name = cityRecord?.name ?? safeCity.replace(/-/g, " ");
  if (!cityRecord) notFound();
  const cityGuides = allGuides.filter((guide) => guide.location_name?.toLowerCase().includes(name.toLowerCase()));
  const featured = events.filter((event) => event.is_featured).slice(0, 3);
  const markers = venues.filter((venue) => venue.lat != null && venue.lng != null).map((venue) => ({ lat: venue.lat!, lng: venue.lng!, slug: venue.slug, title: venue.name, is_live: venue.is_live }));
  const center: [number, number] = cityRecord?.longitude != null && cityRecord.latitude != null ? [cityRecord.longitude, cityRecord.latitude] : markers[0] ? [markers[0].lng, markers[0].lat] : [21.1655, 42.6629];
  const noProgramme = !events.length && !venues.length && !cityGuides.length;
  return <div className="flex min-h-screen flex-col bg-[var(--background)]"><SiteHeader /><main className="flex-1 px-4 py-10 sm:px-6"><DiscoveryTracker metric="city_view" dimensions={{ city: safeCity, has_programme: !noProgramme }} /><div className="mx-auto max-w-6xl"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-300/90">{`${cityRecord.region_name} · ${cityRecord.country_name}`}</p><h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold capitalize text-white sm:text-4xl">{name}</h1><div className="mt-3 flex flex-wrap gap-3 text-sm text-white/55"><span>{t.cityPage.upcomingEvents.replace("{count}", String(events.length))}</span><span>{t.cityPage.activeVenues.replace("{count}", String(venues.length))}</span><Link href="/guides" className="text-sky-300 hover:underline">{t.cityPage.localGuides} →</Link><Link href="/submit-event" className="text-sky-300 hover:underline">{t.eventsPage.submitEvent} →</Link></div>{noProgramme ? <EmptyState className="mt-8" title={t.cityPage.noProgramme.replace("{name}", name)} description={t.cityPage.noProgrammeDesc} icon={<CalendarDays className="h-10 w-10" />} /> : <><section className="mt-10"><h2 className="text-sm font-semibold uppercase tracking-wider text-white/45">{t.cityPage.tonightWeekendUpcoming}</h2><DiscoveryEventBrowser events={events} savedEventIds={savedEventIds} city={name} /></section>{featured.length ? <section className="mt-12"><h2 className="text-sm font-semibold uppercase tracking-wider text-white/45">{t.cityPage.featuredIn.replace("{name}", name)}</h2><div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{featured.map((event) => <div key={event.id} className="rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/5 p-4"><Link href={`/events/${event.slug}`} className="font-semibold text-white hover:text-fuchsia-200">{event.title}</Link><p className="mt-1 text-sm text-white/55">{event.venue?.name ?? t.eventCard.dancefloor}</p></div>)}</div></section> : null}{venues.length ? <section className="mt-12"><h2 className="text-sm font-semibold uppercase tracking-wider text-white/45">{t.cityPage.venues}</h2><div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{venues.map((venue) => <VenueCard key={venue.id} venue={venue} />)}</div></section> : null}{markers.length ? <section className="mt-12"><h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-white/45"><MapPinned className="h-4 w-4" />{t.cityPage.cityMap}</h2><AnimatedMap className="mt-4" center={center} markers={markers} /></section> : null}{cityGuides.length ? <section className="mt-12"><h2 className="text-sm font-semibold uppercase tracking-wider text-white/45">{t.cityPage.guidesFor.replace("{name}", name)}</h2><div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{cityGuides.map((guide) => <GuideCard key={guide.id} guide={guide} />)}</div></section> : null}</>}</div></main><SiteFooter /></div>;
}
