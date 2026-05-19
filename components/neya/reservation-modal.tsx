"use client";

import { useState } from "react";
import { CreditCard, Store } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createReservation } from "@/actions/bookings";
import {
  formatReservationPrice,
  type ReservationPaymentMethod,
  type ResolvedReservationConfig,
} from "@/lib/reservations/config";
import { cn } from "@/lib/utils";

interface ReservationModalProps {
  venueName: string;
  venueId: string;
  eventId?: string | null;
  eventSlug?: string;
  config: ResolvedReservationConfig;
  trigger?: React.ReactNode;
}

function PaymentOption({
  id,
  label,
  description,
  icon: Icon,
  selected,
  onSelect,
}: {
  id: ReservationPaymentMethod;
  label: string;
  description: string;
  icon: typeof CreditCard;
  selected: boolean;
  onSelect: (id: ReservationPaymentMethod) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition",
        selected
          ? "border-sky-400/60 bg-sky-500/10 ring-1 ring-sky-400/30"
          : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          selected ? "bg-sky-500/20 text-sky-300" : "bg-white/5 text-white/50",
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span>
        <span className="block text-sm font-semibold text-white">{label}</span>
        <span className="mt-0.5 block text-xs text-white/50">{description}</span>
      </span>
    </button>
  );
}

function ReservationFeeSummary({ config, priceLabel }: { config: ResolvedReservationConfig; priceLabel: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-white/55">Reservation fee</span>
        <span className="font-semibold text-white">{priceLabel}</span>
      </div>
      <p className="mt-1.5 text-xs text-white/45">
        {config.isFree
          ? "No payment required — guestlist-style hold."
          : config.requiresOnlinePayment
            ? "Online payment required for this venue."
            : "Pay online now or settle at the venue."}
      </p>
    </div>
  );
}

export function ReservationModal({
  venueName,
  venueId,
  eventId,
  eventSlug,
  config,
  trigger,
}: ReservationModalProps) {
  const [open, setOpen] = useState(false);
  const defaultMethod = config.availableMethods[0] ?? "online";
  const [paymentMethod, setPaymentMethod] = useState<ReservationPaymentMethod>(defaultMethod);

  const redirectPath = eventSlug ? `/events/${eventSlug}` : `/venues`;
  const priceLabel = formatReservationPrice(config.priceEur);
  const isFree = config.isFree;

  const submitLabel = isFree
    ? "Confirm reservation"
    : paymentMethod === "pay_at_venue"
      ? "Request table"
      : `Pay ${priceLabel}`;

  const description = isFree
    ? "Free table reservation — no payment required. The venue will confirm your request."
    : config.requiresOnlinePayment && !config.allowsPayAtVenue
      ? `${priceLabel} deposit required online via Stripe.`
      : config.showPaymentSelector
        ? `Reservation fee: ${priceLabel}. Choose how you'd like to pay.`
        : paymentMethod === "pay_at_venue"
          ? `${priceLabel} due at the venue. Your table is held once the venue confirms.`
          : `${priceLabel} deposit via Stripe Checkout.`;

  if (!config.reservationsEnabled) {
    return (
      <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-white/50">
        Table reservations are not open for this venue right now.
      </p>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button variant="default">Reserve table</Button>}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-zinc-950 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Table at {venueName}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <ReservationFeeSummary config={config} priceLabel={priceLabel} />

        <form action={createReservation} className="grid gap-3 py-1">
          <input type="hidden" name="venue_id" value={venueId} />
          {eventId ? <input type="hidden" name="event_id" value={eventId} /> : null}
          <input type="hidden" name="redirect" value={redirectPath} />
          {!isFree && config.showPaymentSelector ? (
            <div className="grid gap-2">
              <p className="text-xs font-medium uppercase tracking-wider text-white/45">Payment method</p>
              {config.availableMethods.includes("online") ? (
                <PaymentOption
                  id="online"
                  label="Pay online"
                  description={`Secure Stripe checkout · ${priceLabel}`}
                  icon={CreditCard}
                  selected={paymentMethod === "online"}
                  onSelect={setPaymentMethod}
                />
              ) : null}
              {config.availableMethods.includes("pay_at_venue") ? (
                <PaymentOption
                  id="pay_at_venue"
                  label="Pay at venue"
                  description={`No charge now · ${priceLabel} at the door`}
                  icon={Store}
                  selected={paymentMethod === "pay_at_venue"}
                  onSelect={setPaymentMethod}
                />
              ) : null}
              <input type="hidden" name="payment_method" value={paymentMethod} />
            </div>
          ) : !isFree ? (
            <input type="hidden" name="payment_method" value={defaultMethod} />
          ) : null}

          <Input name="phone" placeholder="Phone" type="tel" autoComplete="tel" required />
          <Input name="party_size" type="number" placeholder="Guests" defaultValue={2} min={1} max={20} required />
          <Input name="notes" placeholder="Notes (optional)" maxLength={500} />

          <DialogFooter className="gap-2 pt-1 sm:gap-0">
            <Button variant="secondary" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-sky-400 to-fuchsia-500 text-zinc-950 hover:opacity-95"
            >
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
