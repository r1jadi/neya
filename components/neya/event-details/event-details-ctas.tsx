"use client";

import Link from "next/link";
import { GuestlistModal } from "@/components/neya/guestlist-modal";
import { ReservationModal } from "@/components/neya/reservation-modal";
import { SaveEventButton } from "@/components/neya/save-event-button";
import { MyNightButton } from "@/components/my-night/my-night-button";
import { TicketCard } from "@/components/neya/ticket-card";
import type { EventBookingMeta } from "@/services/booking-meta";
import { formatReservationPrice } from "@/lib/reservations/config";
import type { Event } from "@/types";
import { cn, isUuid } from "@/lib/utils";

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
  const hasStripeTicket = Boolean(meta?.ticketTypes.length);
  const hasExternalTicket = Boolean(event.ticket_url);
  const showTicket = hasTicketPrice || hasStripeTicket || hasExternalTicket;

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
          className="w-full rounded-xl bg-gradient-to-r from-sky-400 to-fuchsia-500 py-3 text-sm font-bold text-zinc-950 transition hover:opacity-95"
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
      {hasStripeTicket || (hasTicketPrice && meta?.hasTicketRows) ? (
      <div className="space-y-3">
        {meta?.ticketTypes.map((ticket) => (
          <TicketCard key={ticket.id} eventTitle={event.title} tier={ticket.name} priceEur={ticket.priceCents / 100} currency={ticket.currency} description={ticket.description} quantityAvailable={ticket.quantityAvailable} status={ticket.status} endsAt={ticket.salesEnd ?? undefined} ticketId={ticket.id} />
        ))}
      </div>
    ) : hasExternalTicket ? (
      <a
        href={event.ticket_url!}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-3 text-sm font-bold text-white transition hover:opacity-95"
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
          "fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-zinc-950/90 p-3 backdrop-blur-xl sm:hidden",
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
                  className="flex-1 rounded-xl bg-gradient-to-r from-sky-400 to-fuchsia-500 py-3 text-xs font-bold text-zinc-950"
                >
                  Reserve
                </button>
              }
            />
          ) : null}
          {hasStripeTicket && !meta?.ticketSoldOut ? (
            <Link
              href={`/events/${event.slug}#tickets`}
              className="flex flex-1 items-center justify-center rounded-xl bg-violet-600 py-3 text-xs font-bold text-white"
            >
              Tickets
            </Link>
          ) : hasExternalTicket ? (
            <a
              href={event.ticket_url!}
              target="_blank"
              rel="noopener noreferrer"
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
      <div id="tickets">{ticketBlock}</div>
      {reserveButton}
      {guestlistButton}
    </div>
  );
}
