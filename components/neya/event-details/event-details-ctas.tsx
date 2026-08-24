"use client";

import Link from "next/link";
import { GuestlistModal } from "@/components/neya/guestlist-modal";
import { ReservationModal } from "@/components/neya/reservation-modal";
import { SaveEventButton } from "@/components/neya/save-event-button";
import { MyNightButton } from "@/components/my-night/my-night-button";
import { TicketCard } from "@/components/neya/ticket-card";
import { MobileTicketCheckout } from "@/components/neya/mobile-ticket-checkout";
import { AddToCalendarButton } from "@/components/neya/add-to-calendar-button";
import type { EventBookingMeta } from "@/services/booking-meta";
import { formatReservationPrice } from "@/lib/reservations/config";
import type { Event } from "@/types";
import { cn, isUuid, neyaPrimaryGradient, neyaSecondaryGradient } from "@/lib/utils";
import { trackDiscoveryMetric } from "@/actions/discovery-analytics";

export type EventDetailsFlash = {
  guestlist?: string;
  voted?: string;
  reservation?: string;
  error?: string;
};

interface EventDetailsCtasProps {
  event: Event;
  meta: EventBookingMeta | null;
  saved?: boolean;
  showSave?: boolean;
  purchasedTickets?: number;
  layout?: "sidebar" | "sticky";
  className?: string;
}

export function EventDetailsCtas({
  event,
  meta,
  saved,
  showSave,
  purchasedTickets = 0,
  layout = "sidebar",
  className,
}: EventDetailsCtasProps) {
  const hasTicketPrice = event.ticket_from_eur != null && event.ticket_from_eur > 0;
  const hasTicketTypes = Boolean(meta?.ticketTypes.length);
  const hasExternalTicket = Boolean(event.ticket_url);
  const showTicket = hasTicketPrice || hasTicketTypes || hasExternalTicket;

  const canReserve = meta?.reservation.reservationsEnabled ?? false;

  const reserveButton = meta && canReserve ? (
    <ReservationModal
      venueName={event.venue?.name ?? "Venue"}
      venueId={meta.venueUuid ?? undefined}
      eventId={meta.eventUuid}
      eventSlug={event.slug}
      config={meta.reservation}
      trigger={
        <button
          type="button"
          className={cn("w-full rounded-xl py-3 text-sm font-bold transition", neyaPrimaryGradient)}
        >
          {meta.reservation.isFree ? "Reserve free table" : `Reserve table · ${formatReservationPrice(meta.reservation.priceEur)}`}
        </button>
      }
    />
  ) : meta ? (
    <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-white/50">
      Table reservations are closed for this venue.
    </p>
  ) : (
    <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-white/50">
      Table reservations for this night are not open yet.
    </p>
  );

  const guestlistButton =
    meta?.guestlist && meta.guestlistAvailability ? (
      <GuestlistModal
        eventTitle={event.title}
        eventId={meta.eventUuid}
        guestlist={meta.guestlist}
        availability={meta.guestlistAvailability}
      />
    ) : (
      <p className="rounded-xl border border-dashed border-white/10 px-3 py-2.5 text-center text-xs text-white/40">
        Guestlist not open for this event
      </p>
    );

  const purchasedBanner =
    purchasedTickets > 0 ? (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
        <p className="text-sm font-semibold text-emerald-100">
          ✓ You&apos;re in — {purchasedTickets} ticket{purchasedTickets === 1 ? "" : "s"} for this night
        </p>
        <Link href="/dashboard" className="mt-1 inline-block text-xs text-sky-300 hover:underline">
          View your tickets on the dashboard
        </Link>
      </div>
    ) : null;

  const ticketBlock = showTicket ? (
    <>
      {purchasedBanner}
      {hasTicketTypes || (hasTicketPrice && meta?.hasTicketRows) ? (
      <div className="space-y-3">
        {meta?.ticketTypes.map((ticket) => (
          <TicketCard key={ticket.id} eventId={event.id} eventTitle={event.title} tier={ticket.name} priceEur={ticket.priceCents / 100} currency={ticket.currency} description={ticket.description} quantityAvailable={ticket.quantityAvailable} status={ticket.status} endsAt={ticket.salesEnd ?? undefined} ticketId={ticket.id} />
        ))}
        {meta?.ticketSoldOut ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center">
            <p className="text-sm font-semibold text-white/80">All tickets sold out</p>
            <Link href="/events" className="mt-1 inline-block text-xs text-sky-300 hover:underline">
              Browse other events
            </Link>
          </div>
        ) : null}
      </div>
    ) : hasExternalTicket ? (
      <a
        href={event.ticket_url!}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => void trackDiscoveryMetric("ticket_click", { eventId: event.id, dimensions: { source: "external" } })}
        className={cn("flex w-full items-center justify-center rounded-xl py-3 text-sm font-bold transition", neyaSecondaryGradient)}
      >
        Buy tickets · €{event.ticket_from_eur ?? "—"}
      </a>
    ) : hasTicketPrice ? (
      <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center">
        <p className="text-xs uppercase tracking-widest text-white/45">Tickets</p>
        <p className="mt-1 text-2xl font-bold text-white">€{event.ticket_from_eur}</p>
        <p className="mt-1 text-xs text-white/50">Available at the door or via the venue</p>
      </div>
    ) : null}
    </>
  ) : (
    <p className="rounded-xl border border-dashed border-white/10 px-3 py-2.5 text-center text-xs text-white/40">
      Free entry · no ticket required
    </p>
  );

  if (layout === "sticky") {
    return (
      <div
        className={cn(
          "safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-zinc-950/90 p-3 backdrop-blur-xl sm:hidden",
          className,
        )}
      >
        <div className="mx-auto flex max-w-lg gap-2">
          {meta?.guestlist && meta.guestlistAvailability ? (
            <GuestlistModal
              eventTitle={event.title}
              eventId={meta.eventUuid}
              guestlist={meta.guestlist}
              availability={meta.guestlistAvailability}
              trigger={
        <button
          type="button"
          onClick={() => void trackDiscoveryMetric("reservation_click", { eventId: event.id, venueId: event.venue?.id })}
                  className="flex-1 rounded-xl border border-fuchsia-500/30 bg-fuchsia-500/10 py-3 text-xs font-semibold text-fuchsia-100"
                >
                  Guestlist
                </button>
              }
            />
          ) : null}
          {meta && canReserve ? (
            <ReservationModal
              venueName={event.venue?.name ?? "Venue"}
              venueId={meta.venueUuid ?? undefined}
              eventId={meta.eventUuid}
              eventSlug={event.slug}
              config={meta.reservation}
              trigger={
                <button
                  type="button"
                  className={cn("flex-1 rounded-xl py-3 text-xs font-bold", neyaPrimaryGradient)}
                >
                  Reserve
                </button>
              }
            />
          ) : null}
          {hasTicketTypes && !meta?.ticketSoldOut ? (
            <MobileTicketCheckout event={event} meta={meta!} />
          ) : hasTicketTypes && meta?.ticketSoldOut ? (
            <Link
              href="/events"
              className="flex flex-1 items-center justify-center rounded-xl border border-white/10 bg-white/5 py-3 text-xs font-semibold text-white/50"
            >
              Sold out
            </Link>
          ) : hasExternalTicket ? (
            <a
              href={event.ticket_url!}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => void trackDiscoveryMetric("ticket_click", { eventId: event.id, dimensions: { source: "external_sticky" } })}
              className="flex flex-1 items-center justify-center rounded-xl bg-violet-600 py-3 text-xs font-bold text-white"
            >
              Tickets
            </a>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {isUuid(event.id) ? (
        <MyNightButton
          variant="default"
          className="w-full border-sky-400/25 bg-sky-500/10 text-sky-100 hover:border-sky-400/40 hover:bg-sky-500/20"
          stop={{
            stopId: "",
            kind: "event",
            refId: event.id,
            title: event.title,
            subtitle: event.venue?.name ?? "Venue TBA",
            time: event.starts_at,
            endsAt: event.ends_at ?? null,
            image: event.image_url,
            slug: event.slug,
            lat: event.venue?.lat ?? null,
            lng: event.venue?.lng ?? null,
            available: true,
          }}
        />
      ) : null}
      {showSave && isUuid(event.id) ? (
        <SaveEventButton eventId={event.id} eventSlug={event.slug} initialSaved={Boolean(saved)} className="w-full" />
      ) : null}
      <AddToCalendarButton event={event} className="w-full" />
      <div id="tickets">{ticketBlock}</div>
      {reserveButton}
      {guestlistButton}
    </div>
  );
}
