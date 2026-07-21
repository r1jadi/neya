import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Script from "next/script";
import { EventCard } from "@/components/neya/event-card";
import { ExternalLink, Globe, Mail, MapPin, Music, Phone, Users } from "lucide-react";
import { LiveBadge } from "@/components/neya/live-badge";
import { ReservationModal } from "@/components/neya/reservation-modal";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Badge } from "@/components/ui/badge";
import { getPublicCheckinCount, getVenueMetaBySlug } from "@/services/booking-meta";
import { getFeaturedEvents } from "@/services/events";
import { getVenueBySlug } from "@/services/venues";
import { SITE } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { venueJsonLd } from "@/lib/seo/json-ld";
import { isUuid } from "@/lib/utils";
import { CheckInWidget } from "@/components/neya/check-in-widget";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const venue = await getVenueBySlug(slug);
  if (!venue) return { title: "Venue not found" };
  return {
    title: `${venue.name} · ${SITE.name}`,
    description: `${venue.name} in Prishtina — nightlife on NEYA.`,
    openGraph: {
      title: venue.name,
      images: [{ url: venue.image_url }],
    },
  };
}

export default async function VenuePage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();
  const [venue, allEvents, venueMeta] = await Promise.all([
    getVenueBySlug(slug),
    getFeaturedEvents(supabase),
    getVenueMetaBySlug(slug),
  ]);
  if (!venue) notFound();

  const events = allEvents.filter((e) => e.venue?.slug === venue.slug);
  const jsonLd = venueJsonLd(venue);

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
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-12 pb-12">
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-widest text-white/45">About</h2>
                {venue.description ? (
                  <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-white/75">{venue.description}</p>
                ) : (
                  <div className="mt-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-sm text-white/45">
                    No description available yet.
                  </div>
                )}
              </section>

              {venue.gallery_urls?.length ? (
                <section>
                  <h2 className="text-sm font-semibold uppercase tracking-widest text-white/45">Gallery</h2>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {venue.gallery_urls.map((url, i) => (
                      <div key={i} className="relative aspect-[4/3] overflow-hidden rounded-xl border border-white/10">
                        <Image src={url} alt={`${venue.name} gallery image ${i + 1}`} fill className="object-cover" />
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              <section>
                <h2 className="text-lg font-semibold text-white">Upcoming here</h2>
                {events.length ? (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {events.map((e) => (
                      <EventCard key={e.id} event={e} />
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-white/50">No events listed yet.</p>
                )}
              </section>
            </div>

            <aside className="space-y-6">
              <div className="sticky top-24 rounded-2xl border border-white/[0.08] bg-zinc-950/80 p-5 backdrop-blur-xl space-y-6">
                
                {venue.address ? (
                  <div>
                    <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/40 mb-2">
                      <MapPin className="h-4 w-4" /> Location
                    </h3>
                    <p className="text-sm text-white/80">{venue.address}</p>
                    <Link
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue.name} ${venue.address || venue.city_slug}`)}`}
                      target="_blank"
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-sky-300 hover:underline"
                    >
                      Open in Maps <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                ) : null}

                {venue.capacity ? (
                  <div>
                    <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/40 mb-2">
                      <Users className="h-4 w-4" /> Capacity
                    </h3>
                    <p className="text-sm text-white/80">~{venue.capacity} people</p>
                  </div>
                ) : null}

                {venue.music_genres?.length ? (
                  <div>
                    <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/40 mb-2">
                      <Music className="h-4 w-4" /> Music
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {venue.music_genres.map((g) => (
                        <span key={g} className="rounded-md border border-white/[0.08] bg-white/[0.02] px-2.5 py-1 text-xs text-white/80 capitalize">{g}</span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {(venue.website || venue.social_links?.instagram || venue.social_links?.facebook) ? (
                  <div>
                    <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/40 mb-2">
                      <Globe className="h-4 w-4" /> Links
                    </h3>
                    <div className="flex flex-col gap-2 text-sm">
                      {venue.website ? (
                        <Link href={venue.website.startsWith('http') ? venue.website : `https://${venue.website}`} target="_blank" className="text-white/80 hover:text-white hover:underline flex items-center gap-2">
                          <Globe className="h-4 w-4 text-white/40" /> Website
                        </Link>
                      ) : null}
                      {venue.social_links?.instagram ? (
                        <Link href={`https://instagram.com/${venue.social_links.instagram.replace('@', '')}`} target="_blank" className="text-white/80 hover:text-white hover:underline flex items-center gap-2">
                          <svg className="h-4 w-4 text-white/40" fill="currentColor" viewBox="0 0 24 24"><path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 1.5A4.25 4.25 0 0 0 3.5 7.75v8.5A4.25 4.25 0 0 0 7.75 20.5h8.5A4.25 4.25 0 0 0 20.5 16.25v-8.5A4.25 4.25 0 0 0 16.25 3.5Zm4.25 3.25a5.25 5.25 0 1 1 0 10.5 5.25 5.25 0 0 1 0-10.5Zm0 1.5a3.75 3.75 0 1 0 0 7.5 3.75 3.75 0 0 0 0-7.5Zm5.5-.75a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"/></svg> Instagram
                        </Link>
                      ) : null}
                      {venue.social_links?.facebook ? (
                        <Link href={venue.social_links.facebook} target="_blank" className="text-white/80 hover:text-white hover:underline flex items-center gap-2">
                          <svg className="h-4 w-4 text-white/40" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-1.11 9-5.39 9-10.45z"/></svg> Facebook
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {(venue.contact_email || venue.contact_phone) ? (
                  <div>
                    <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/40 mb-2">
                      <Mail className="h-4 w-4" /> Contact
                    </h3>
                    <div className="flex flex-col gap-2 text-sm text-white/80">
                      {venue.contact_email ? (
                        <Link href={`mailto:${venue.contact_email}`} className="hover:text-white hover:underline flex items-center gap-2">
                          <Mail className="h-4 w-4 text-white/40" /> {venue.contact_email}
                        </Link>
                      ) : null}
                      {venue.contact_phone ? (
                        <Link href={`tel:${venue.contact_phone}`} className="hover:text-white hover:underline flex items-center gap-2">
                          <Phone className="h-4 w-4 text-white/40" /> {venue.contact_phone}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ) : null}

              </div>
            </aside>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
