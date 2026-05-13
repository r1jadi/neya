import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Script from "next/script";
import { AtmosphereMeter } from "@/components/neya/atmosphere-meter";
import { CrowdIndicator } from "@/components/neya/crowd-indicator";
import { GuestlistModal } from "@/components/neya/guestlist-modal";
import { LiveBadge } from "@/components/neya/live-badge";
import { ReservationModal } from "@/components/neya/reservation-modal";
import { TicketCard } from "@/components/neya/ticket-card";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Badge } from "@/components/ui/badge";
import { getEventBySlug } from "@/services/events";
import { SITE } from "@/lib/constants";
import { eventJsonLd } from "@/lib/seo/json-ld";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return { title: "Event not found" };
  return {
    title: `${event.title} · ${SITE.name}`,
    description: `${event.title} at ${event.venue.name} — ${event.genre} in Prishtina.`,
    openGraph: {
      title: event.title,
      description: `Live atmosphere ${event.atmosphere_rating.toFixed(1)}/10 · ${event.crowd_count} people here now`,
      images: [{ url: event.image_url }],
    },
  };
}

export default async function EventDetailPage({ params }: Props) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const jsonLd = eventJsonLd(event);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <Script id="event-jsonld" type="application/ld+json" strategy="afterInteractive">
        {JSON.stringify(jsonLd)}
      </Script>
      <SiteHeader />
      <main className="flex-1">
        <div className="relative aspect-[21/9] w-full max-h-[420px] overflow-hidden">
          <Image src={event.image_url} alt="" fill className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3">
              <LiveBadge live={event.live_status} />
              <Badge variant="neon">{event.genre}</Badge>
            </div>
            <h1 className="mx-auto mt-3 max-w-6xl font-[family-name:var(--font-display)] text-3xl font-bold text-white sm:text-5xl">
              {event.title}
            </h1>
            <p className="mx-auto mt-2 max-w-6xl text-white/70">
              <Link href={`/venues/${event.venue.slug}`} className="hover:text-white hover:underline">
                {event.venue.name}
              </Link>
            </p>
          </div>
        </div>
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3 sm:px-6">
          <div className="space-y-6 sm:col-span-2">
            <CrowdIndicator count={event.crowd_count} />
            <AtmosphereMeter score={event.atmosphere_rating} />
            {event.fomo_line ? (
              <p className="rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/5 p-4 text-sm font-medium text-fuchsia-100">
                {event.fomo_line}
              </p>
            ) : null}
          </div>
          <div className="space-y-4">
            {event.ticket_from_eur != null ? (
              <TicketCard
                eventTitle={event.title}
                tier="General"
                priceEur={event.ticket_from_eur}
                endsAt="tonight"
              />
            ) : null}
            <ReservationModal
              venueName={event.venue.name}
              trigger={
                <button
                  type="button"
                  className="w-full rounded-xl bg-gradient-to-r from-sky-400 to-fuchsia-500 py-3 text-sm font-bold text-zinc-950"
                >
                  Reserve table
                </button>
              }
            />
            <GuestlistModal
              eventTitle={event.title}
              trigger={
                <button
                  type="button"
                  className="w-full rounded-xl border border-white/15 bg-white/5 py-3 text-sm font-semibold text-white"
                >
                  Guestlist
                </button>
              }
            />
          </div>
        </div>
        <p className="pb-12 text-center">
          <Link href="/events" className="text-sm text-sky-300 hover:underline">
            All events
          </Link>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
