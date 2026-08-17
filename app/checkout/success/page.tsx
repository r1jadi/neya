import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Payment complete · ${SITE.name}`,
};

type Props = {
  searchParams: Promise<{ session_id?: string; type?: string; ticket_order_id?: string }>;
};

export default async function CheckoutSuccessPage({ searchParams }: Props) {
  const q = await searchParams;
  const isReservation = q.type === "reservation";
  const ticketOrderId = q.ticket_order_id;

  // successUrl is a frontend redirect only — it is NOT proof of payment.
  // For tickets, reflect the authoritative NEYA order state instead of
  // claiming the payment succeeded. The provider webhook (not this page) is
  // what moves the order to paid/failed/cancelled.
  let ticketStatus: string | null = null;
  if (ticketOrderId) {
    const supabase = await createClient();
    const { data: order } = await supabase
      .from("ticket_orders")
      .select("payment_status")
      .eq("id", ticketOrderId)
      .maybeSingle();
    ticketStatus = order?.payment_status ?? null;
  }
  const ticketPaid = ticketStatus === "paid";
  const ticketFailed = ticketStatus === "failed" || ticketStatus === "cancelled";

  const title = isReservation
    ? "You're locked in"
    : ticketPaid
      ? "You're locked in"
      : ticketFailed
        ? "Payment didn't complete"
        : ticketOrderId
          ? "Payment received — confirming your tickets"
          : "Payment complete";

  const body = isReservation
    ? "Your table deposit is confirmed. Check your email for the Stripe receipt."
    : ticketPaid
      ? "Your tickets are confirmed — your QR code is ready on your NEYA profile."
      : ticketFailed
        ? "Your payment didn't complete, so no tickets were issued. If any charge went through, it is confirmed automatically on your NEYA profile."
        : ticketOrderId
          ? "We received your payment and are confirming it with the payment provider. Your tickets will appear on your NEYA profile as soon as confirmation completes — no action needed."
          : "Thanks — your payment was received.";

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <SiteHeader />
      <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white">{title}</h1>
        <p className="mt-3 text-sm text-white/60">{body}</p>
        <Button asChild className="mt-8">
          <Link href="/dashboard">View your NEYA</Link>
        </Button>
        <Link href="/events" className="mt-4 text-sm text-sky-300 hover:underline">
          Back to tonight
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
