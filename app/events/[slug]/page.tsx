import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Script from "next/script";
import { AtmosphereMeter } from "@/components/neya/atmosphere-meter";
import { CrowdIndicator } from "@/components/neya/crowd-indicator";
import { GuestlistModal } from "@/components/neya/guestlist-modal";
import { LiveBadge } from "@/components/neya/live-badge";
import { LiveAtmospherePanel } from "@/components/neya/live-atmosphere-panel";
import { ReservationModal } from "@/components/neya/reservation-modal";
import { SaveEventButton } from "@/components/neya/save-event-button";
import { TicketCard } from "@/components/neya/ticket-card";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { SITE } from "@/lib/constants";
import { eventJsonLd } from "@/lib/seo/json-ld";
import { isUuid } from "@/lib/utils";
import { getEventBookingMetaBySlug } from "@/services/booking-meta";
import { getEventBySlug } from "@/services/events";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ voted?: string; error?: string; guestlist?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const event = await getEventBySlug(slug, supabase);
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

export default async function EventDetailPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [event, meta] = await Promise.all([getEventBySlug(slug, supabase), getEventBookingMetaBySlug(slug)]);
  if (!event) notFound();

  let saved = false;
  if (user && isUuid(event.id)) {
    const { data: s } = await supabase
      .from("saved_events")
      .select("event_id")
      .eq("user_id", user.id)
      .eq("event_id", event.id)
      .maybeSingle();
    saved = Boolean(s);
  }

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
              {event.is_hidden_premium ? (
                <Badge variant="secondary" className="border-fuchsia-500/40 text-fuchsia-200">
                  Premium room
                </Badge>
              ) : null}
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
            {sp.guestlist === "applied" ? (
              <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
                Guestlist request sent.
              </p>
            ) : null}
            {sp.guestlist === "duplicate" ? (
              <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                You&apos;re already on this list.
              </p>
            ) : null}
            {sp.voted ? (
              <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
                Thanks — your pulse is in the room.
              </p>
            ) : null}
            {sp.error === "vote" ? (
              <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                Could not save your vote. Make sure you are logged in and try again.
              </p>
            ) : null}
            <CrowdIndicator count={event.crowd_count} />
            {isUuid(event.id) ? (
              <LiveAtmospherePanel
                eventId={event.id}
                venueId={event.venue.id}
                eventSlug={event.slug}
                initialScore={event.atmosphere_rating}
              />
            ) : (
              <AtmosphereMeter score={event.atmosphere_rating} />
            )}
            {event.fomo_line ? (
              <p className="rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/5 p-4 text-sm font-medium text-fuchsia-100">
                {event.fomo_line}
              </p>
            ) : null}
          </div>
          <div className="space-y-4">
            {user && isUuid(event.id) ? (
              <SaveEventButton eventId={event.id} eventSlug={event.slug} initialSaved={saved} className="w-full" />
            ) : null}
            {event.ticket_from_eur != null ? (
              <TicketCard
                eventTitle={event.title}
                tier="General"
                priceEur={event.ticket_from_eur}
                endsAt="tonight"
                soldOut={Boolean(meta?.ticketSoldOut)}
                ticketId={meta?.ticketId ?? undefined}
              />
            ) : null}
            {meta ? (
              <ReservationModal
                venueName={event.venue.name}
                venueId={meta.venueUuid}
                eventId={meta.eventUuid}
                trigger={
                  <button
                    type="button"
                    className="w-full rounded-xl bg-gradient-to-r from-sky-400 to-fuchsia-500 py-3 text-sm font-bold text-zinc-950"
                  >
                    Reserve table
                  </button>
                }
              />
            ) : (
              <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/50">
                Table deposits require this event in your Supabase project (see seed SQL).
              </p>
            )}
            {meta?.guestlistId ? (
              <GuestlistModal
                eventTitle={event.title}
                eventSlug={event.slug}
                guestlistId={meta.guestlistId}
                trigger={
                  <button
                    type="button"
                    className="w-full rounded-xl border border-white/15 bg-white/5 py-3 text-sm font-semibold text-white"
                  >
                    Guestlist
                  </button>
                }
              />
            ) : null}
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
