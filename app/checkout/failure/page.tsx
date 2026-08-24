import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Payment failed · ${SITE.name}`,
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ ticket_order_id?: string; reservation_id?: string }> };

export default async function CheckoutFailurePage({ searchParams }: Props) {
  const { ticket_order_id: ticketOrderId, reservation_id: reservationId } = await searchParams;

  const supabase = await createClient();

  let eventSlug: string | null = null;
  let eventTitle: string | null = null;

  if (ticketOrderId) {
    const { data } = await supabase
      .from("ticket_orders")
      .select("tickets(events(slug, title))")
      .eq("id", ticketOrderId)
      .maybeSingle();
    const ticketRow = Array.isArray(data?.tickets) ? data?.tickets?.[0] : data?.tickets;
    const evRaw = ticketRow?.events;
    const ev = Array.isArray(evRaw) ? evRaw[0] : evRaw;
    eventSlug = ev?.slug ?? null;
    eventTitle = ev?.title ?? null;
  } else if (reservationId) {
    const { data } = await supabase
      .from("reservations")
      .select("events(slug, title)")
      .eq("id", reservationId)
      .maybeSingle();
    const ev = data?.events as { slug?: string; title?: string } | null;
    eventSlug = ev?.slug ?? null;
    eventTitle = ev?.title ?? null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <AlertCircle className="h-14 w-14 text-red-400" strokeWidth={1.5} />
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-2xl font-bold text-white">
          Payment didn&apos;t go through
        </h1>
        <p className="mt-3 text-sm text-white/60">
          No payment was completed — your tickets have not been purchased.
          {eventTitle ? ` Try again for ${eventTitle}.` : " Try again or use another card."}
        </p>

        <div className="mt-6 flex w-full flex-col gap-2">
          {eventSlug ? (
            <Button asChild>
              <Link href={`/events/${eventSlug}`}>Try again</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link href="/events">Browse events</Link>
            </Button>
          )}
          <Button asChild variant="secondary">
            <Link href="/dashboard">View your NEYA</Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
