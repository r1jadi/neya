"use client";

import { TicketCard } from "@/components/neya/ticket-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { EventBookingMeta } from "@/services/booking-meta";
import type { Event } from "@/types";

type Props = {
  event: Event;
  meta: EventBookingMeta;
};

/**
 * Mobile has no desktop sidebar, so its Tickets CTA must own the ticket picker
 * instead of linking to the sidebar-only #tickets element. Each TicketCard
 * retains the normal form submission to the RaiAccept server action.
 */
export function MobileTicketCheckout({ event, meta }: Props) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex flex-1 items-center justify-center rounded-xl bg-violet-600 py-3 text-xs font-bold text-white"
        >
          Tickets
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-zinc-950 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tickets for {event.title}</DialogTitle>
          <DialogDescription>Select a ticket and quantity to continue securely with RaiAccept.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-1">
          {meta.ticketTypes.map((ticket) => (
            <TicketCard
              key={ticket.id}
              eventId={event.id}
              eventTitle={event.title}
              tier={ticket.name}
              priceEur={ticket.priceCents / 100}
              currency={ticket.currency}
              description={ticket.description}
              quantityAvailable={ticket.quantityAvailable}
              status={ticket.status}
              endsAt={ticket.salesEnd ?? undefined}
              ticketId={ticket.id}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
