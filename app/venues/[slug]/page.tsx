import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Script from "next/script";
import { ArrowRight, ExternalLink, Globe, Mail, MapPin, Music2, Phone, Users } from "lucide-react";
import { EventCard } from "@/components/neya/event-card";
import { LiveBadge } from "@/components/neya/live-badge";
import { ReservationModal } from "@/components/neya/reservation-modal";
import { SaveVenueButton } from "@/components/neya/save-venue-button";
import { ShareButton } from "@/components/neya/share-button";
import { VenuePulsePanel } from "@/components/neya/venue-pulse-panel";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Badge } from "@/components/ui/badge";
import { getPublicCheckinCount, getVenueMetaBySlug } from "@/services/booking-meta";
import { getUpcomingEventsForVenue } from "@/services/events";
import { getVenueBySlug } from "@/services/venues";
import { getArtistsForEvents } from "@/services/artists";
import { getActiveHighlightForVenue } from "@/services/venue-highlights";
import { getVenuePulse } from "@/services/pulse";
import { SITE } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { venueJsonLd } from "@/lib/seo/json-ld";
import { isUuid, neyaPrimaryGradient } from "@/lib/utils";
import { isHappeningNow, isOnDayOffset, isOnThisWeekend } from "@/lib/event-dates";
import { getDictionary } from "@/lib/i18n/server";
import { CheckInWidget } from "@/components/neya/check-in-widget";
import { MyNightButton } from "@/components/my-night/my-night-button";
import { DiscoveryTracker } from "@/components/neya/discovery-tracker";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ checkin?: string }>;
};

function externalUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function eventStartTime(startsAt: string): string {
  return new Date(startsAt).toLocaleTimeString("en-GB", {
    timeZone: "Europe/Belgrade",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const venue = await getVenueBySlug(slug);
  if (!venue) return { title: "Venue not found" };
  return {
    title: `${venue.name} · ${SITE.name}`,
    description: venue.description ?? `${venue.name} in Prishtina — nightlife on NEYA.`,
    alternates: {
      canonical: `${SITE.url}/venues/${venue.slug}`,
    },
    openGraph: {
      type: "website",
      title: venue.name,
      description: venue.description ?? `${venue.name} in Prishtina — nightlife on NEYA.`,
      url: `${SITE.url}/venues/${venue.slug}`,
      images: [{ url: venue.image_url }],
    },
    twitter: {
      card: "summary_large_image",
      title: venue.name,
      description: venue.description ?? `${venue.name} in Prishtina — nightlife on NEYA.`,
      images: [venue.image_url],
    },
  };
}

export default async function VenuePage({ params, searchParams }: Props) {
  const t = await getDictionary();
  const { slug } = await params;
  const q = await searchParams;
  const supabase = await createClient();
  const [venue, venueMeta] = await Promise.all([
    getVenueBySlug(slug),
    getVenueMetaBySlug(slug),
  ]);
  if (!venue) notFound();

  const [events, highlight, pulse] = await Promise.all([
    getUpcomingEventsForVenue(venue.id, supabase),
    getActiveHighlightForVenue(venue.id),
    isUuid(venue.id) ? getVenuePulse(venue.id) : Promise.resolve(null),
  ]);
  const lineupByEvent = await getArtistsForEvents(events.map((e) => e.id).filter(isUuid));
  const lineupArtists = [...new Map(
    Object.values(lineupByEvent).flat().map((artist) => [artist.id, artist]),
  ).values()].slice(0, 12);
  const jsonLd = venueJsonLd(venue);
  const gallery = venue.gallery_urls?.filter((url) => url !== venue.image_url) ?? [];
  const mapQuery = venue.lat != null && venue.lng != null ? `${venue.lat},${venue.lng}` : venue.address;
  const mapUrl = mapQuery ? `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed` : null;
  const directionsUrl = mapQuery
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapQuery)}`
    : null;
  const websiteUrl = externalUrl(venue.website_url ?? venue.social_links?.website);
  const socialLinks = Object.entries(venue.social_links ?? {})
    .filter(([name]) => name.toLowerCase() !== "website")
    .map(([name, value]) => [name, externalUrl(value)] as const)
    .filter((entry): entry is [string, string] => entry[1] !== null);

  // Split the venue's real upcoming events into Tonight / Tomorrow / Weekend / Later.
  const tonightEvents = events.filter((e) => isOnDayOffset(e.starts_at, 0));
  const tomorrowEvents = events.filter((e) => isOnDayOffset(e.starts_at, 1));
  const weekendEvents = events.filter(
    (e) => isOnThisWeekend(e.starts_at) && !isOnDayOffset(e.starts_at, 0) && !isOnDayOffset(e.starts_at, 1),
  );
  const laterEvents = events.filter(
    (e) => !isOnDayOffset(e.starts_at, 0) && !isOnDayOffset(e.starts_at, 1) && !isOnThisWeekend(e.starts_at),
  );

  let publicCheckins = 0;
  if (venueMeta && isUuid(venueMeta.venueUuid)) {
    publicCheckins = await getPublicCheckinCount(venueMeta.venueUuid);
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <Script id="venue-jsonld" type="application/ld+json" strategy="afterInteractive">
        {JSON.stringify(jsonLd)}
      </Script>
      <SiteHeader />
      <main className="flex-1">
        <DiscoveryTracker metric="venue_view" venueId={venue.id} dimensions={{ city: venue.city_slug, category: venue.category }} />
        <div className="relative aspect-[16/7] w-full max-h-[380px] overflow-hidden">
          <Image src={venue.image_url} alt={`${venue.name} — ${venue.category.replace(/_/g, " ")}`} fill className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2">
              <Badge variant="secondary">{venue.category.replace(/_/g, " ")}</Badge>
              <LiveBadge live={venue.is_live} />
              {venue.crowd_count != null && venue.crowd_count > 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/25 bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-200 backdrop-blur">
                  👥 {venue.crowd_count} {t.venuePage.here}
                </span>
              ) : null}
              {venue.atmosphere_score != null && venue.atmosphere_score > 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-400/25 bg-orange-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-200 backdrop-blur">
                  🔥 {venue.atmosphere_score.toFixed(1)} {t.venuePage.vibe}
                </span>
              ) : null}
            </div>
            <h1 className="mx-auto mt-3 max-w-6xl font-[family-name:var(--font-display)] text-4xl font-bold text-white sm:text-5xl">
              {venue.name}
            </h1>
          </div>
        </div>
        <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6">
          {q.checkin === "1" ? (
            <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
              {t.venuePage.checkedIn}
            </p>
          ) : null}
          {q.checkin === "err" ? (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {t.venuePage.checkInFailed}
            </p>
          ) : null}
          {q.checkin === "rate" ? (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
              {t.venuePage.checkInRated}
            </p>
          ) : null}

          {/* Quick actions — Save, Share, Directions (thumb-friendly). */}
          <div className="flex flex-wrap items-center gap-2">
            {isUuid(venue.id) ? (
              <SaveVenueButton venueId={venue.id} venueSlug={venue.slug} className="flex-1 sm:flex-none" />
            ) : null}
            <ShareButton
              title={venue.name}
              text={`${venue.name} — ${venue.category.replace(/_/g, " ")} · ${venue.city_slug.replace(/-/g, " ")} on NEYA`}
              variant="solid"
              className="flex-1 sm:flex-none"
              kind="venue"
            />
            {directionsUrl ? (
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-sky-400/30 bg-sky-500/10 px-3 py-2 text-sm font-semibold text-sky-200 transition hover:bg-sky-500/20 sm:flex-none"
              >
                <MapPin className="h-4 w-4 shrink-0" />
                <span className="sm:hidden">{t.venuePage.directions}</span>
                <span className="hidden whitespace-nowrap sm:inline">{t.venuePage.getDirections}</span>
              </a>
            ) : null}
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
            {venueMeta && isUuid(venueMeta.venueUuid) ? (
              <CheckInWidget
                venueId={venueMeta.venueUuid}
                venueSlug={venue.slug}
                publicCount={publicCheckins}
              />
            ) : null}
            <div className="flex flex-wrap gap-4">
              {isUuid(venue.id) ? (
                <MyNightButton
                  variant="default"
                  className="border-sky-400/25 bg-sky-500/10 text-sky-100 hover:border-sky-400/40 hover:bg-sky-500/20"
                  stop={{
                    stopId: "",
                    kind: "venue",
                    refId: venue.id,
                    title: venue.name,
                    subtitle: venue.address,
                    time: null,
                    image: venue.image_url,
                    slug: venue.slug,
                    lat: venue.lat ?? null,
                    lng: venue.lng ?? null,
                    available: true,
                  }}
                />
              ) : null}
              {venueMeta && venueMeta.reservation.reservationsEnabled ? (
                <ReservationModal
                  venueName={venue.name}
                  venueId={venueMeta.venueUuid}
                  config={venueMeta.reservation}
                />
              ) : venueMeta ? (
                <p className="text-xs text-white/45">{t.venuePage.tablesClosed}</p>
              ) : (
                <p className="text-xs text-white/45">{t.venuePage.tablesSoon}</p>
              )}
            </div>
          </div>

          {/* The heart of the page: what's happening here. */}
          <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]">
            <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-4">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-white sm:text-xl">
                {t.venuePage.tonightAt.replace("{name}", venue.name)}
              </h2>
              <LiveBadge live={tonightEvents.some((e) => isHappeningNow(e.starts_at, e.ends_at))} />
            </div>
            {tonightEvents.length ? (
              <ul className="divide-y divide-white/[0.06]">
                {tonightEvents.map((event) => {
                  const playing = isHappeningNow(event.starts_at, event.ends_at);
                  return (
                    <li key={event.id}>
                      <Link
                        href={`/events/${event.slug}`}
                        className="group flex items-center gap-4 px-5 py-4 transition hover:bg-sky-500/[0.06]"
                      >
                        <div className="flex w-14 shrink-0 flex-col items-center rounded-xl border border-white/10 bg-black/30 py-2">
                          <span className={playing ? "text-[10px] font-bold uppercase tracking-widest text-emerald-300" : "text-[10px] font-bold uppercase tracking-widest text-sky-300"}>
                            {playing ? t.venuePage.now : t.venuePage.at}
                          </span>
                          <span className="text-sm font-bold tabular-nums text-white">{eventStartTime(event.starts_at)}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-white group-hover:text-sky-100">{event.title}</p>
                          <p className="mt-0.5 line-clamp-1 text-xs text-white/50">
                            {event.category ? <span className="capitalize">{event.category.replace(/_/g, " ")}</span> : null}
                            {event.is_free ? ` · ${t.venuePage.free}` : null}
                            {event.ticket_from_eur != null && event.ticket_from_eur > 0 ? ` · €${event.ticket_from_eur}` : null}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 shrink-0 text-white/30 transition group-hover:translate-x-0.5 group-hover:text-sky-300" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="px-5 py-8 text-center">
                <p className="font-[family-name:var(--font-display)] text-lg font-semibold text-white">
                  {t.venuePage.nothingTonight}
                </p>
                <p className="mx-auto mt-1 max-w-sm text-sm text-white/50">
                  {t.venuePage.nothingTonightDesc.replace("{name}", venue.name)}
                </p>
                <Link
                  href="/events"
                  className={`mt-4 inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold transition ${neyaPrimaryGradient}`}
>
                  {t.venuePage.browseUpcoming}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </section>

          {tomorrowEvents.length ? (
            <section>
              <div className="flex items-end justify-between gap-4">
                <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-white sm:text-xl">
                  {t.venuePage.tomorrowAt.replace("{name}", venue.name)}
                </h2>
                <Link href="/events" className="text-sm font-semibold text-sky-300 hover:text-sky-200">
                  {t.actions.viewAll}
                </Link>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {tomorrowEvents.map((event) => <EventCard key={event.id} event={event} />)}
              </div>
            </section>
          ) : null}

          {weekendEvents.length ? (
            <section>
              <div className="flex items-end justify-between gap-4">
                <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-white sm:text-xl">
                  {t.venuePage.weekendAt.replace("{name}", venue.name)}
                </h2>
                <Link href="/events" className="text-sm font-semibold text-sky-300 hover:text-sky-200">
                  {t.actions.viewAll}
                </Link>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {weekendEvents.map((event) => <EventCard key={event.id} event={event} />)}
              </div>
            </section>
          ) : null}

          {highlight ? (
            <section className="relative overflow-hidden rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-950/25 via-zinc-950/60 to-fuchsia-950/20 p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                {highlight.image_url ? (
                  <Image
                    src={highlight.image_url}
                    alt=""
                    width={192}
                    height={128}
                    className="h-28 w-full shrink-0 rounded-xl border border-white/10 object-cover sm:w-48"
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300/90">{t.venuePage.thisWeek}</p>
                  <h2 className="mt-1 text-xl font-semibold text-white">{highlight.title}</h2>
                  <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-white/70">
                    {highlight.content}
                  </p>
                  {highlight.event ? (
                    <Link
                      href={`/events/${highlight.event.slug}`}
                      className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-sky-300 hover:text-sky-200 hover:underline"
                    >
                      {t.venuePage.viewEvent}
                      <span aria-hidden>→</span>
                    </Link>
                  ) : null}
                </div>
              </div>
            </section>
          ) : null}

          {/* Venue pulse — real aggregated reviews across the venue's nights. */}
          {pulse && (pulse.overall != null || pulse.samples > 0) ? (
            <section className="max-w-2xl">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-white/45">{t.venuePage.venuePulse}</h2>
              <VenuePulsePanel pulse={pulse} crowdCount={venue.crowd_count} />
            </section>
          ) : null}

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-8">
              <section>
                <h2 className="text-lg font-semibold text-white">{t.venuePage.about.replace("{name}", venue.name)}</h2>
                {venue.description ? (
                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-white/65">{venue.description}</p>
                ) : (
                  <p className="mt-3 text-sm text-white/45">{t.venuePage.detailsComing}</p>
                )}
              </section>

              {gallery.length ? (
                <section>
                  <h2 className="text-lg font-semibold text-white">{t.venuePage.gallery}</h2>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {gallery.map((url, index) => (
                      <div key={`${url}-${index}`} className="relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
                        <Image src={url} alt={t.venuePage.galleryImage.replace("{name}", venue.name).replace("{index}", String(index + 1))} fill className="object-cover" sizes="(max-width: 640px) 50vw, 25vw" />
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              <section>
                <h2 className="text-lg font-semibold text-white">{t.venuePage.location}</h2>
                {mapUrl ? (
                  <a
                    href={directionsUrl ?? `https://www.google.com/maps?q=${encodeURIComponent(mapQuery ?? "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <iframe
                      title={t.venuePage.mapOf.replace("{name}", venue.name)}
                      src={mapUrl}
                      className="h-72 w-full rounded-2xl border border-white/10 bg-white/[0.03]"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </a>
                ) : (
                  <p className="mt-3 text-sm text-white/45">{t.venuePage.locationComing}</p>
                )}
              </section>
            </div>

            <aside className="h-fit space-y-5 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
              <h2 className="text-lg font-semibold text-white">{t.venuePage.venueDetails}</h2>
              {venue.address ? (
                <p className="flex items-start gap-3 text-sm text-white/65"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />{venue.address}</p>
              ) : null}
              {directionsUrl ? (
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-fit items-center gap-2 rounded-xl border border-sky-400/30 bg-sky-500/10 px-3 py-2 text-sm font-semibold text-sky-200 transition hover:bg-sky-500/20"
                >
                  <MapPin className="h-4 w-4" />
                  {t.venuePage.getDirections}
                </a>
              ) : null}
              {venue.capacity != null ? (
                <p className="flex items-center gap-3 text-sm text-white/65"><Users className="h-4 w-4 shrink-0 text-sky-300" />{t.venuePage.capacity} {venue.capacity.toLocaleString()}</p>
              ) : null}
              {venue.music_genres?.length ? (
                <div className="flex items-start gap-3 text-sm text-white/65">
                  <Music2 className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
                  <div className="flex flex-wrap gap-2">{venue.music_genres.map((genre) => <Badge key={genre} variant="secondary">{genre}</Badge>)}</div>
                </div>
              ) : null}
              {websiteUrl ? (
                <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-sky-300 hover:text-sky-200 hover:underline"><Globe className="h-4 w-4" />{t.venuePage.website} <ExternalLink className="h-3.5 w-3.5" /></a>
              ) : null}
              {venue.contact_email ? (
                <a href={`mailto:${venue.contact_email}`} className="flex items-center gap-3 text-sm text-white/65 hover:text-white"><Mail className="h-4 w-4 text-sky-300" />{venue.contact_email}</a>
              ) : null}
              {venue.contact_phone ? (
                <a href={`tel:${venue.contact_phone}`} className="flex items-center gap-3 text-sm text-white/65 hover:text-white"><Phone className="h-4 w-4 text-sky-300" />{venue.contact_phone}</a>
              ) : null}
              {socialLinks.length ? (
                <div className="border-t border-white/10 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-white/40">{t.venuePage.follow}</p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {socialLinks.map(([name, url]) => <a key={name} href={url} target="_blank" rel="noopener noreferrer" className="text-sm capitalize text-sky-300 hover:text-sky-200 hover:underline">{name}</a>)}
                  </div>
                </div>
              ) : null}
            </aside>
          </div>
          {lineupArtists.length ? (
            <section>
              <h2 className="text-lg font-semibold text-white">{t.venuePage.whosPlaying}</h2>
              <div className="mt-4 flex flex-wrap gap-3">
                {lineupArtists.map((artist) => (
                  <Link
                    key={artist.id}
                    href={`/artists/${artist.slug}`}
                    className="group flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] py-2 pl-2 pr-4 transition hover:border-fuchsia-400/30 hover:bg-fuchsia-500/5"
                  >
                    {artist.profile_image ? (
                      <Image src={artist.profile_image} alt={artist.name} width={40} height={40} className="h-10 w-10 rounded-xl object-cover" />
                    ) : null}
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-white group-hover:text-fuchsia-100">
                        {artist.name}
                      </span>
                      {artist.genres.length ? (
                        <span className="block text-xs text-white/45">{artist.genres.slice(0, 2).join(" · ")}</span>
                      ) : null}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
          <div>
            {laterEvents.length ? (
              <section>
                <div className="flex items-end justify-between gap-4">
                  <h2 className="text-lg font-semibold text-white">{t.venuePage.comingUpAt.replace("{name}", venue.name)}</h2>
                  <Link href="/events" className="text-sm font-semibold text-sky-300 hover:text-sky-200">
                    {t.actions.viewAll}
                  </Link>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {laterEvents.map((event) => <EventCard key={event.id} event={event} />)}
                </div>
              </section>
            ) : null}
            {!events.length ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center">
                <p className="font-[family-name:var(--font-display)] text-lg font-semibold text-white">
                  {t.venuePage.nothingHere}
                </p>
                <p className="mt-1 text-sm text-white/45">{t.venuePage.nothingHereDesc}</p>
                <Link
                  href="/events"
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-sky-300 hover:text-sky-200 hover:underline"
                >
                  {t.venuePage.browseUpcoming}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}