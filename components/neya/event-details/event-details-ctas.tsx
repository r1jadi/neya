"use client";

import Link from "next/link";
import { GuestlistModal } from "@/components/neya/guestlist-modal";
import { ReservationModal } from "@/components/neya/reservation-modal";
import { SaveEventButton } from "@/components/neya/save-event-button";
import { TicketCard } from "@/components/neya/ticket-card";
import type { EventBookingMeta } from "@/services/booking-meta";
import type { Event } from "@/types";
import { cn, isUuid } from "@/lib/utils";

export type EventDetailsFlash = {
  guestlist?: string;
  voted?: string;
  error?: string;
};

interface EventDetailsCtasProps {
  event: Event;
  meta: EventBookingMeta | null;
  saved?: boolean;
  showSave?: boolean;
  layout?: "sidebar" | "sticky";
  className?: string;
}

export function EventDetailsCtas({
  event,
  meta,
  saved,
  showSave,
  layout = "sidebar",
  className,
}: EventDetailsCtasProps) {
  const hasTicketPrice = event.ticket_from_eur != null && event.ticket_from_eur > 0;
  const hasStripeTicket = Boolean(meta?.ticketId);
  const hasExternalTicket = Boolean(event.ticket_url);
  const showTicket = hasTicketPrice || hasStripeTicket || hasExternalTicket;

  const reserveButton = meta ? (
    <ReservationModal
      venueName={event.venue.name}
      venueId={meta.venueUuid}
      eventId={meta.eventUuid}
      trigger={
        <button
          type="button"
          className="w-full rounded-xl bg-gradient-to-r from-sky-400 to-fuchsia-500 py-3 text-sm font-bold text-zinc-950 transition hover:opacity-95"
        >
          Reserve table
        </button>
      }
    />
  ) : (
    <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-white/50">
      Table reservations for this night are not open yet.
    </p>
  );

  const guestlistButton = meta?.guestlistId ? (
    <GuestlistModal
      eventTitle={event.title}
      eventSlug={event.slug}
      guestlistId={meta.guestlistId}
      trigger={
        <button
          type="button"
          className="w-full rounded-xl border border-white/15 bg-white/5 py-3 text-sm font-semibold text-white transition hover:border-white/25 hover:bg-white/10"
        >
          Guestlist
        </button>
      }
    />
  ) : (
    <p className="rounded-xl border border-dashed border-white/10 px-3 py-2.5 text-center text-xs text-white/40">
      Guestlist not open for this event
    </p>
  );

  const ticketBlock = showTicket ? (
    hasStripeTicket || (hasTicketPrice && meta?.hasTicketRows) ? (
      <TicketCard
        eventTitle={event.title}
        tier="General"
        priceEur={event.ticket_from_eur ?? 0}
        endsAt="tonight"
        soldOut={Boolean(meta?.ticketSoldOut)}
        ticketId={meta?.ticketId ?? undefined}
      />
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
    ) : null
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
          {meta?.guestlistId ? (
            <GuestlistModal
              eventTitle={event.title}
              eventSlug={event.slug}
              guestlistId={meta.guestlistId}
              trigger={
                <button
                  type="button"
                  className="flex-1 rounded-xl border border-white/15 bg-white/5 py-3 text-xs font-semibold text-white"
                >
                  Guestlist
                </button>
              }
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
      {showSave && isUuid(event.id) ? (
        <SaveEventButton eventId={event.id} eventSlug={event.slug} initialSaved={Boolean(saved)} className="w-full" />
      ) : null}
      <div id="tickets">{ticketBlock}</div>
      {reserveButton}
      {guestlistButton}
    </div>
  );
}
