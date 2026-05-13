import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Script from "next/script";
import { LiveBadge } from "@/components/neya/live-badge";
import { ReservationModal } from "@/components/neya/reservation-modal";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Badge } from "@/components/ui/badge";
import { MOCK_EVENTS } from "@/data/mock-data";
import { getVenueBySlug } from "@/services/venues";
import { SITE } from "@/lib/constants";
import { venueJsonLd } from "@/lib/seo/json-ld";

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
  const venue = await getVenueBySlug(slug);
  if (!venue) notFound();

  const events = MOCK_EVENTS.filter((e) => e.venue.slug === venue.slug);
  const jsonLd = venueJsonLd(venue);

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
          <div className="flex flex-wrap gap-4">
            <ReservationModal venueName={venue.name} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Upcoming here</h2>
            <ul className="mt-4 space-y-2">
              {events.length ? (
                events.map((e) => (
                  <li key={e.id}>
                    <Link href={`/events/${e.slug}`} className="text-sky-300 hover:underline">
                      {e.title}
                    </Link>
                  </li>
                ))
              ) : (
                <li className="text-sm text-white/50">No linked events in mock data.</li>
              )}
            </ul>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
