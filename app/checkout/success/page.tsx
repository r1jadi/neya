import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock, MapPin, Ticket, Users } from "lucide-react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Payment complete · ${SITE.name}`,
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ type?: string; ticket_order_id?: string; reservation_id?: string }>;
};

type TicketOrderRow = {
  id: string;
  quantity: number;
  amount_cents: number;
  currency: string;
  payment_status: string;
  qr_payload: string | null;
  tickets: {
    tier_name: string | null;
    events: {
      title: string | null;
      slug: string | null;
      starts_at: string | null;
      venues: { name: string | null; slug: string | null } | null;
    } | null;
  } | null;
};

type ReservationRow = {
  id: string;
  status: string;
  party_size: number;
  payment_status: string;
  venues: { name: string | null; slug: string | null } | null;
  events: { title: string | null; slug: string | null; starts_at: string | null } | null;
};

export default async function CheckoutSuccessPage({ searchParams }: Props) {
  const q = await searchParams;
  const isReservation = q.type === "reservation";
  const ticketOrderId = q.ticket_order_id;
  const reservationId = q.reservation_id;

  const supabase = await createClient();

  let ticketOrder: TicketOrderRow | null = null;
  if (ticketOrderId) {
    const { data } = await supabase
      .from("ticket_orders")
      .select(
        "id, quantity, amount_cents, currency, payment_status, qr_payload, tickets(tier_name, events(title, slug, starts_at, venues(name, slug)))",
      )
      .eq("id", ticketOrderId)
      .maybeSingle();
    ticketOrder = (data as TicketOrderRow | null) ?? null;
  }

  let reservation: ReservationRow | null = null;
  if (isReservation && reservationId) {
    const { data } = await supabase
      .from("reservations")
      .select("id, status, party_size, payment_status, venues(name, slug), events(title, slug, starts_at)")
      .eq("id", reservationId)
      .maybeSingle();
    reservation = (data as ReservationRow | null) ?? null;
  }

  // successUrl is a frontend redirect only — it is NOT proof of payment.
  // The provider webhook (not this page) is what moves the order to
  // paid/failed/cancelled. Reflect the authoritative NEYA order state.
  const ticketStatus = ticketOrder?.payment_status ?? null;
  const ticketPaid = ticketStatus === "paid";
  const ticketFailed = ticketStatus === "failed" || ticketStatus === "cancelled";

  // Derive event details from whichever entity we have.
  // Supabase joins may return arrays — normalize to a single object.
  const ticketRow = Array.isArray(ticketOrder?.tickets) ? ticketOrder?.tickets?.[0] : ticketOrder?.tickets;
  const ticketEventRaw = ticketRow?.events;
  const ticketEvent = Array.isArray(ticketEventRaw) ? ticketEventRaw[0] : ticketEventRaw;
  const ticketVenueRaw = ticketEvent?.venues;
  const ticketVenue = Array.isArray(ticketVenueRaw) ? ticketVenueRaw[0] : ticketVenueRaw;
  const resEventRaw = reservation?.events;
  const resEvent = Array.isArray(resEventRaw) ? resEventRaw[0] : resEventRaw;

  const eventTitle = ticketEvent?.title ?? resEvent?.title ?? null;
  const eventSlug = ticketEvent?.slug ?? resEvent?.slug ?? null;
  const eventStartsAt = ticketEvent?.starts_at ?? resEvent?.starts_at ?? null;
  const venueName = ticketVenue?.name ?? reservation?.venues?.name ?? null;
  const venueSlug = ticketVenue?.slug ?? reservation?.venues?.slug ?? null;
  const tierName = ticketOrder?.tickets?.tier_name ?? null;
  const quantity = ticketOrder?.quantity ?? null;

  // --- Determine the messaging ---
  type Variant = { icon: typeof CheckCircle2; tone: "success" | "pending" | "failed"; title: string; body: string };
  let variant: Variant;

  if (isReservation) {
    const resPaid = reservation?.payment_status === "paid";
    variant = {
      icon: resPaid ? CheckCircle2 : Clock,
      tone: resPaid ? "success" : "pending",
      title: resPaid ? "Reservation confirmed" : "Reservation submitted",
      body: resPaid
        ? "Your table is locked in. Show this confirmation at the venue."
        : "We received your reservation and are confirming it. Your table will update automatically once confirmed.",
    };
  } else if (ticketPaid) {
    variant = {
      icon: CheckCircle2,
      tone: "success",
      title: "You're in 🎉",
      body: "Your tickets are confirmed. Your entry code is ready on your NEYA profile.",
    };
  } else if (ticketFailed) {
    variant = {
      icon: Clock,
      tone: "failed",
      title: "Payment didn't complete",
      body: "Your payment didn't go through, so no tickets were issued. If any charge went through, it is confirmed automatically on your profile.",
    };
  } else if (ticketOrderId) {
    variant = {
      icon: Clock,
      tone: "pending",
      title: "Payment received — confirming",
      body: "We received your payment and are confirming it with the provider. Your tickets will appear on your profile as soon as confirmation completes — no action needed.",
    };
  } else {
    variant = {
      icon: CheckCircle2,
      tone: "success",
      title: "Payment complete",
      body: "Thanks — your payment was received.",
    };
  }

  const Icon = variant.icon;
  const iconColor =
    variant.tone === "success"
      ? "text-emerald-400"
      : variant.tone === "pending"
        ? "text-sky-400"
        : "text-red-400";

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <Icon className={`h-14 w-14 ${iconColor}`} strokeWidth={1.5} />
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-2xl font-bold text-white">
          {variant.title}
        </h1>
        <p className="mt-3 text-sm text-white/60">{variant.body}</p>

        {/* Event-specific details */}
        {eventTitle ? (
          <div className="mt-6 w-full rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left">
            {eventSlug ? (
              <Link href={`/events/${eventSlug}`} className="font-medium text-white hover:underline">
                {eventTitle}
              </Link>
            ) : (
              <p className="font-medium text-white">{eventTitle}</p>
            )}
            <div className="mt-2 space-y-1.5 text-sm text-white/55">
              {venueName ? (
                <p className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-white/40" />
                  {venueSlug ? (
                    <Link href={`/venues/${venueSlug}`} className="hover:text-white hover:underline">
                      {venueName}
                    </Link>
                  ) : (
                    venueName
                  )}
                </p>
              ) : null}
              {eventStartsAt ? (
                <p className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-white/40" />
                  {new Date(eventStartsAt).toLocaleString("en-GB", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              ) : null}
              {tierName ? (
                <p className="flex items-center gap-2">
                  <Ticket className="h-3.5 w-3.5 text-white/40" />
                  {tierName}
                  {quantity ? ` × ${quantity}` : ""}
                </p>
              ) : null}
              {reservation ? (
                <p className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-white/40" />
                  {reservation.party_size} guests
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Next-actions */}
        <div className="mt-6 flex w-full flex-col gap-2">
          {ticketPaid ? (
            <Button asChild>
              <Link href="/dashboard">View your ticket</Link>
            </Button>
          ) : isReservation && reservation ? (
            <Button asChild>
              <Link href="/dashboard">View reservation</Link>
            </Button>
          ) : ticketFailed ? (
            eventSlug ? (
              <Button asChild>
                <Link href={`/events/${eventSlug}`}>Try again</Link>
              </Button>
            ) : (
              <Button asChild>
                <Link href="/events">Browse events</Link>
              </Button>
            )
          ) : (
            <Button asChild>
              <Link href="/dashboard">View your NEYA</Link>
            </Button>
          )}
          {eventSlug ? (
            <Button asChild variant="secondary">
              <Link href={`/events/${eventSlug}`}>Back to event</Link>
            </Button>
          ) : null}
          <Link href="/events" className="mt-1 text-sm text-sky-300 hover:underline">
            Browse tonight
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
