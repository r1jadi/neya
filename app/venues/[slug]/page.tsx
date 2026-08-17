import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Script from "next/script";
import { ExternalLink, Globe, Mail, MapPin, Music2, Phone, Users } from "lucide-react";
import { EventCard } from "@/components/neya/event-card";
import { LiveBadge } from "@/components/neya/live-badge";
import { ReservationModal } from "@/components/neya/reservation-modal";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Badge } from "@/components/ui/badge";
import { getPublicCheckinCount, getVenueMetaBySlug } from "@/services/booking-meta";
import { getUpcomingEventsForVenue } from "@/services/events";
import { getVenueBySlug } from "@/services/venues";
import { getArtistsForEvents } from "@/services/artists";
import { getActiveHighlightForVenue } from "@/services/venue-highlights";
import { SITE } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { venueJsonLd } from "@/lib/seo/json-ld";
import { isUuid } from "@/lib/utils";
import { CheckInWidget } from "@/components/neya/check-in-widget";

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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const venue = await getVenueBySlug(slug);
  if (!venue) return { title: "Venue not found" };
  return {
    title: `${venue.name} · ${SITE.name}`,
    description: venue.description ?? `${venue.name} in Prishtina — nightlife on NEYA.`,
    openGraph: {
      title: venue.name,
      images: [{ url: venue.image_url }],
    },
  };
}

export default async function VenuePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const q = await searchParams;
  const supabase = await createClient();
  const [venue, venueMeta] = await Promise.all([
    getVenueBySlug(slug),
    getVenueMetaBySlug(slug),
  ]);
  if (!venue) notFound();

  const [events, highlight] = await Promise.all([
    getUpcomingEventsForVenue(venue.id, supabase),
    getActiveHighlightForVenue(venue.id),
  ]);
  const lineupByEvent = await getArtistsForEvents(events.map((e) => e.id).filter(isUuid));
  const lineupArtists = [...new Map(
    Object.values(lineupByEvent).flat().map((artist) => [artist.id, artist]),
  ).values()].slice(0, 12);
  const jsonLd = venueJsonLd(venue);
  const gallery = venue.gallery_urls?.filter((url) => url !== venue.image_url) ?? [];
  const mapQuery = venue.lat != null && venue.lng != null ? `${venue.lat},${venue.lng}` : venue.address;
  const mapUrl = mapQuery ? `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed` : null;
  const websiteUrl = externalUrl(venue.website_url ?? venue.social_links?.website);
  const socialLinks = Object.entries(venue.social_links ?? {})
    .filter(([name]) => name.toLowerCase() !== "website")
    .map(([name, value]) => [name, externalUrl(value)] as const)
    .filter((entry): entry is [string, string] => entry[1] !== null);

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
        <div className="relative aspect-[16/7] w-full max-h-[380px] overflow-hidden">
          <Image src={venue.image_url} alt="" fill className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2">
              <Badge variant="secondary">{venue.category.replace(/_/g, " ")}</Badge>
              <LiveBadge live={venue.is_live} />
            </div>
            <h1 className="mx-auto mt-3 max-w-6xl font-[family-name:var(--font-display)] text-4xl font-bold text-white sm:text-5xl">
              {venue.name}
            </h1>
          </div>
        </div>
        <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6">
          {q.checkin === "1" ? (
            <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
              You&apos;re checked in — see you tonight ✦
            </p>
          ) : null}
          {q.checkin === "err" ? (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              We couldn&apos;t record your check-in. Please try again.
            </p>
          ) : null}
          {q.checkin === "rate" ? (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
              You&apos;ve checked in recently — take a breath and try again in a bit.
            </p>
          ) : null}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
            {venueMeta && isUuid(venueMeta.venueUuid) ? (
              <CheckInWidget
                venueId={venueMeta.venueUuid}
                venueSlug={venue.slug}
                publicCount={publicCheckins}
              />
            ) : null}
            <div className="flex flex-wrap gap-4">
              {venueMeta && venueMeta.reservation.reservationsEnabled ? (
                <ReservationModal
                  venueName={venue.name}
                  venueId={venueMeta.venueUuid}
                  config={venueMeta.reservation}
                />
              ) : venueMeta ? (
                <p className="text-xs text-white/45">Table reservations are closed for this venue.</p>
              ) : (
                <p className="text-xs text-white/45">Table reservations open when the venue is live on NEYA.</p>
              )}
            </div>
          </div>
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
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300/90">This week</p>
                  <h2 className="mt-1 text-xl font-semibold text-white">{highlight.title}</h2>
                  <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-white/70">
                    {highlight.content}
                  </p>
                  {highlight.event ? (
                    <Link
                      href={`/events/${highlight.event.slug}`}
                      className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-sky-300 hover:text-sky-200 hover:underline"
                    >
                      View event
                      <span aria-hidden>→</span>
                    </Link>
                  ) : null}
                </div>
              </div>
            </section>
          ) : null}

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-8">
              <section>
                <h2 className="text-lg font-semibold text-white">About {venue.name}</h2>
                {venue.description ? (
                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-white/65">{venue.description}</p>
                ) : (
                  <p className="mt-3 text-sm text-white/45">Details for this venue are coming soon.</p>
                )}
              </section>

              {gallery.length ? (
                <section>
                  <h2 className="text-lg font-semibold text-white">Gallery</h2>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {gallery.map((url, index) => (
                      <div key={`${url}-${index}`} className="relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
                        <Image src={url} alt={`${venue.name} gallery image ${index + 1}`} fill className="object-cover" sizes="(max-width: 640px) 50vw, 25vw" />
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              <section>
                <h2 className="text-lg font-semibold text-white">Location</h2>
                {mapUrl ? (
                  <iframe
                    title={`Map of ${venue.name}`}
                    src={mapUrl}
                    className="mt-4 h-72 w-full rounded-2xl border border-white/10 bg-white/[0.03]"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                ) : (
                  <p className="mt-3 text-sm text-white/45">Location details are coming soon.</p>
                )}
              </section>
            </div>

            <aside className="h-fit space-y-5 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
              <h2 className="text-lg font-semibold text-white">Venue details</h2>
              {venue.address ? (
                <p className="flex items-start gap-3 text-sm text-white/65"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />{venue.address}</p>
              ) : null}
              {mapQuery ? (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapQuery)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-fit items-center gap-2 rounded-xl border border-sky-400/30 bg-sky-500/10 px-3 py-2 text-sm font-semibold text-sky-200 transition hover:bg-sky-500/20"
                >
                  <MapPin className="h-4 w-4" />
                  Get directions
                </a>
              ) : null}
              {venue.capacity != null ? (
                <p className="flex items-center gap-3 text-sm text-white/65"><Users className="h-4 w-4 shrink-0 text-sky-300" />Capacity {venue.capacity.toLocaleString()}</p>
              ) : null}
              {venue.music_genres?.length ? (
                <div className="flex items-start gap-3 text-sm text-white/65">
                  <Music2 className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
                  <div className="flex flex-wrap gap-2">{venue.music_genres.map((genre) => <Badge key={genre} variant="secondary">{genre}</Badge>)}</div>
                </div>
              ) : null}
              {websiteUrl ? (
                <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-sky-300 hover:text-sky-200 hover:underline"><Globe className="h-4 w-4" />Website <ExternalLink className="h-3.5 w-3.5" /></a>
              ) : null}
              {venue.contact_email ? (
                <a href={`mailto:${venue.contact_email}`} className="flex items-center gap-3 text-sm text-white/65 hover:text-white"><Mail className="h-4 w-4 text-sky-300" />{venue.contact_email}</a>
              ) : null}
              {venue.contact_phone ? (
                <a href={`tel:${venue.contact_phone}`} className="flex items-center gap-3 text-sm text-white/65 hover:text-white"><Phone className="h-4 w-4 text-sky-300" />{venue.contact_phone}</a>
              ) : null}
              {socialLinks.length ? (
                <div className="border-t border-white/10 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-white/40">Follow</p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {socialLinks.map(([name, url]) => <a key={name} href={url} target="_blank" rel="noopener noreferrer" className="text-sm capitalize text-sky-300 hover:text-sky-200 hover:underline">{name}</a>)}
                  </div>
                </div>
              ) : null}
            </aside>
          </div>
          {lineupArtists.length ? (
            <section>
              <h2 className="text-lg font-semibold text-white">Who&apos;s playing</h2>
              <div className="mt-4 flex flex-wrap gap-3">
                {lineupArtists.map((artist) => (
                  <Link
                    key={artist.id}
                    href={`/artists/${artist.slug}`}
                    className="group flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] py-2 pl-2 pr-4 transition hover:border-fuchsia-400/30 hover:bg-fuchsia-500/5"
                  >
                    {artist.profile_image ? (
                      <Image src={artist.profile_image} alt="" width={40} height={40} className="h-10 w-10 rounded-xl object-cover" />
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
            <h2 className="text-lg font-semibold text-white">Upcoming here</h2>
            {events.length ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {events.map((e) => (
                  <EventCard key={e.id} event={e} />
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-sm text-white/45">
                No events listed here yet — check back soon, or browse the rest of the city tonight.
              </p>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
