"use client";

import { motion } from "framer-motion";
import { QrCode, Timer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { createTicketCheckout } from "@/actions/bookings";

interface TicketCardProps {
  eventTitle: string;
  tier: string;
  priceEur: number;
  endsAt?: string;
  soldOut?: boolean;
  ticketId?: string | null;
  className?: string;
}

export function TicketCard({ eventTitle, tier, priceEur, endsAt, soldOut, ticketId, className }: TicketCardProps) {
  const canBuy = Boolean(ticketId) && !soldOut;

  return (
    <motion.div whileHover={{ y: -2 }} className={cn(className)}>
      <Card className="overflow-hidden border-white/10 bg-gradient-to-br from-zinc-900/90 to-black/80">
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-widest text-white/45">Ticket</p>
            <CardTitle className="mt-1 text-xl">{eventTitle}</CardTitle>
          </div>
          <Badge variant={soldOut ? "destructive" : "neon"}>{soldOut ? "Sold out" : tier}</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-white/50">From</p>
              <p className="text-3xl font-bold tabular-nums text-white">€{priceEur}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/40 p-3">
              <QrCode className="h-10 w-10 text-white/70" aria-hidden />
            </div>
          </div>
          {endsAt ? (
            <p className="inline-flex items-center gap-2 text-xs text-amber-200/90">
              <Timer className="h-3.5 w-3.5" />
              Early bird ends {endsAt}
            </p>
          ) : null}
          {canBuy ? (
            <form action={createTicketCheckout}>
              <input type="hidden" name="ticket_id" value={ticketId!} />
              <Button type="submit" className="w-full">
                Buy with Stripe
              </Button>
            </form>
          ) : ticketId && soldOut ? (
            <p className="text-center text-xs text-white/50">Sold out online — check door policy.</p>
          ) : null}
        </CardContent>
      </Card>
    </motion.div>
  );
}
