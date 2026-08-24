"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Minus, Plus, Timer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn, neyaSecondaryGradient } from "@/lib/utils";
import { createTicketCheckout } from "@/actions/bookings";
import { trackDiscoveryMetric } from "@/actions/discovery-analytics";

interface TicketCardProps {
  eventTitle: string;
  tier: string;
  priceEur: number;
  description?: string | null;
  currency?: string;
  quantityAvailable?: number | null;
  status?: "available" | "sold_out" | "closed";
  endsAt?: string;
  soldOut?: boolean;
  ticketId?: string | null;
  className?: string;
  eventId?: string;
}

function formatPrice(cents: number, currency: string): string {
  const eur = cents / 100;
  const symbol = currency === "EUR" ? "€" : `${currency} `;
  return `${symbol}${eur % 1 === 0 ? eur.toFixed(0) : eur.toFixed(2)}`;
}

export function TicketCard({
  eventTitle,
  tier,
  priceEur,
  description,
  currency = "EUR",
  quantityAvailable,
  status,
  endsAt,
  soldOut,
  ticketId,
  className,
  eventId,
}: TicketCardProps) {
  const [now] = useState(() => Date.now());
  const [quantity, setQuantity] = useState(1);

  const salesEnded = Boolean(endsAt) && new Date(endsAt!).getTime() <= now;
  const unavailable = soldOut || status === "sold_out" || status === "closed" || salesEnded;
  const canBuy = Boolean(ticketId) && !unavailable;
  const maxQuantity = Math.min(20, quantityAvailable ?? 20);
  const totalPrice = priceEur * quantity;
  const ctaLabel = `Pay ${formatPrice(totalPrice * 100, currency)}`;

  function decrement() {
    setQuantity((q) => Math.max(1, q - 1));
  }
  function increment() {
    setQuantity((q) => Math.min(maxQuantity, q + 1));
  }

  return (
    <motion.div whileHover={canBuy ? { y: -2 } : undefined} className={cn(className)}>
      <Card
        className={cn(
          "overflow-hidden border-white/10 bg-gradient-to-br from-zinc-900/90 to-black/80 transition",
          unavailable && "opacity-70",
        )}
      >
        <CardContent className="space-y-3 p-4">
          {/* Tier name as primary heading + status badge */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-widest text-white/40">{eventTitle}</p>
              <p className="mt-0.5 text-lg font-bold text-white">{tier}</p>
            </div>
            <Badge variant={unavailable ? "destructive" : "neon"}>
              {status === "closed" ? "Closed" : salesEnded ? "Ended" : unavailable ? "Sold out" : "Available"}
            </Badge>
          </div>

          {/* Price + description */}
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tabular-nums text-white">
              {formatPrice(priceEur * 100, currency)}
            </span>
            {quantityAvailable != null && !unavailable && quantityAvailable <= 15 ? (
              <span className="text-xs text-amber-200/90">{quantityAvailable} left</span>
            ) : null}
          </div>
          {description ? <p className="text-sm text-white/55">{description}</p> : null}
          {endsAt ? (
            <p className="inline-flex items-center gap-1.5 text-xs text-white/40">
              <Timer className="h-3 w-3" />
              {salesEnded ? "Sales ended" : "Sales end"} {new Date(endsAt).toLocaleDateString()}
            </p>
          ) : null}

          {/* Quantity stepper + total + CTA */}
          {canBuy ? (
            <form
              action={createTicketCheckout}
              onSubmit={() => void trackDiscoveryMetric("ticket_click", { eventId, dimensions: { source: "ticket_tier" } })}
              className="space-y-3 pt-1"
            >
              <input type="hidden" name="ticket_id" value={ticketId!} />
              <input type="hidden" name="redirect" value={typeof window === "undefined" ? "/events" : window.location.pathname} />
              <input type="hidden" name="quantity" value={quantity} />

              {/* Stepper + per-ticket price */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={decrement}
                    disabled={quantity <= 1}
                    aria-label="Decrease quantity"
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-black/40 text-white transition",
                      quantity <= 1 ? "cursor-not-allowed opacity-40" : "hover:border-white/25 hover:bg-white/10",
                    )}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center text-base font-semibold tabular-nums text-white">{quantity}</span>
                  <button
                    type="button"
                    onClick={increment}
                    disabled={quantity >= maxQuantity}
                    aria-label="Increase quantity"
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-black/40 text-white transition",
                      quantity >= maxQuantity ? "cursor-not-allowed opacity-40" : "hover:border-white/25 hover:bg-white/10",
                    )}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <span className="text-xs text-white/45">× {formatPrice(priceEur * 100, currency)}</span>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                <span className="text-xs font-medium uppercase tracking-wider text-white/45">Total</span>
                <span className="text-lg font-bold tabular-nums text-white">{formatPrice(totalPrice * 100, currency)}</span>
              </div>

              <SubmitButton
                className={cn("w-full", neyaSecondaryGradient)}
                pendingText="Preparing checkout…"
              >
                {ctaLabel}
              </SubmitButton>
            </form>
          ) : ticketId && unavailable ? (
            <p className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5 text-center text-xs text-white/45">
              {status === "closed"
                ? "Ticket sales are closed."
                : salesEnded
                  ? "Ticket sales have ended for this event."
                  : "Sold out online — check door policy."}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </motion.div>
  );
}
