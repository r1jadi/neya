import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Script from "next/script";
import { EventDetailsPageShell } from "@/components/neya/event-details/event-details-page-shell";
import { EventDetailsView } from "@/components/neya/event-details/event-details-view";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { createClient } from "@/lib/supabase/server";
import { SITE } from "@/lib/constants";
import { getEventDescription } from "@/lib/event-display";
import { eventJsonLd } from "@/lib/seo/json-ld";
import { isUuid } from "@/lib/utils";
import { getEventBookingMetaBySlug } from "@/services/booking-meta";
import { getArtistsForEvent } from "@/services/artists";
import { getEventBySlug } from "@/services/events";
import { getEventSources } from "@/services/event-sources";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ voted?: string; error?: string; guestlist?: string; reservation?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const event = await getEventBySlug(slug, supabase);
  if (!event) return { title: "Event not found" };
  const description =
    getEventDescription(event) ??
    `${event.title}${event.venue ? ` at ${event.venue.name}` : ""} — ${event.genre} in Prishtina.`;
  return {
    title: `${event.title} · ${SITE.name}`,
    description,
    openGraph: {
      title: event.title,
      description,
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

  const event = await getEventBySlug(slug, supabase);
  if (!event) notFound();

  const [meta, artists, sources] = await Promise.all([
    getEventBookingMetaBySlug(slug),
    getArtistsForEvent(isUuid(event.id) ? event.id : ""),
    getEventSources(event.id, supabase),
  ]);

  let saved = false;
  let purchasedTickets = 0;
  if (user && isUuid(event.id)) {
    const [s, orders] = await Promise.all([
      supabase
        .from("saved_events")
        .select("event_id")
        .eq("user_id", user.id)
        .eq("event_id", event.id)
        .maybeSingle(),
      supabase
        .from("ticket_orders")
        .select("id, tickets(event_id)", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("tickets.event_id", event.id)
        .eq("payment_status", "paid"),
    ]);
    saved = Boolean(s.data);
    purchasedTickets = orders.count ?? 0;
  }

  const jsonLd = eventJsonLd(event, meta?.ticketTypes);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <Script id="event-jsonld" type="application/ld+json" strategy="afterInteractive">
        {JSON.stringify(jsonLd)}
      </Script>
      <SiteHeader />
      <main className="flex-1">
        <EventDetailsPageShell>
          <EventDetailsView
            event={event}
            meta={meta}
            artists={artists}
            sources={sources}
            saved={saved}
            purchasedTickets={purchasedTickets}
            showSave={Boolean(user)}
            flash={{
              guestlist: sp.guestlist,
              voted: sp.voted,
              reservation: sp.reservation,
              error: sp.error,
            }}
          />
        </EventDetailsPageShell>
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
