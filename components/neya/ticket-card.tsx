"use client";

import { motion } from "framer-motion";
import { QrCode, Timer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useFormStatus } from "react-dom";
import { createTicketCheckout } from "@/actions/bookings";

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
}

function BuyButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Preparing checkout…" : "Buy ticket"}
    </Button>
  );
}

export function TicketCard({ eventTitle, tier, priceEur, description, currency = "EUR", quantityAvailable, status, endsAt, soldOut, ticketId, className }: TicketCardProps) {
  const unavailable = soldOut || status === "sold_out" || status === "closed";
  const canBuy = Boolean(ticketId) && !unavailable;
  const maxQuantity = Math.min(20, quantityAvailable ?? 20);

  return (
    <motion.div whileHover={{ y: -2 }} className={cn(className)}>
      <Card className="overflow-hidden border-white/10 bg-gradient-to-br from-zinc-900/90 to-black/80">
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div><p className="text-xs uppercase tracking-widest text-white/45">Ticket</p><CardTitle className="mt-1 text-xl">{eventTitle}</CardTitle></div>
          <Badge variant={unavailable ? "destructive" : "neon"}>{status === "closed" ? "Closed" : unavailable ? "Sold out" : tier}</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end justify-between"><div><p className="text-xs text-white/50">{tier}</p><p className="text-3xl font-bold tabular-nums text-white">{currency === "EUR" ? "€" : `${currency} `}{priceEur}</p></div><div className="rounded-xl border border-white/10 bg-black/40 p-3"><QrCode className="h-10 w-10 text-white/70" aria-hidden /></div></div>
          {description ? <p className="text-sm text-white/65">{description}</p> : null}
          {quantityAvailable != null && !unavailable ? <p className="text-xs text-amber-200/90">{quantityAvailable} remaining</p> : null}
          {endsAt ? <p className="inline-flex items-center gap-2 text-xs text-amber-200/90"><Timer className="h-3.5 w-3.5" />Sales end {new Date(endsAt).toLocaleDateString()}</p> : null}
          {canBuy ? <form action={createTicketCheckout}><input type="hidden" name="ticket_id" value={ticketId!} /><input type="hidden" name="redirect" value={typeof window === "undefined" ? "/events" : window.location.pathname} /><label className="mb-3 flex items-center justify-between gap-3 text-sm text-white/70">Quantity<select name="quantity" defaultValue="1" className="rounded-lg border border-white/10 bg-black/50 px-2 py-1 text-white">{Array.from({ length: maxQuantity }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select></label><BuyButton /></form> : ticketId && unavailable ? <p className="text-center text-xs text-white/50">{status === "closed" ? "Ticket sales are closed." : "Sold out online — check door policy."}</p> : null}
        </CardContent>
      </Card>
    </motion.div>
  );
}
