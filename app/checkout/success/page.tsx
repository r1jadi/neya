import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Payment complete · ${SITE.name}`,
};

type Props = { searchParams: Promise<{ session_id?: string; type?: string }> };

export default async function CheckoutSuccessPage({ searchParams }: Props) {
  const q = await searchParams;
  const isReservation = q.type === "reservation";

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <SiteHeader />
      <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white">You&apos;re locked in</h1>
        <p className="mt-3 text-sm text-white/60">
          {isReservation
            ? "Your table deposit is confirmed. Check your email for the Stripe receipt."
            : `Stripe confirmed your payment${q.session_id ? " — details are on your receipt email." : "."}`}
        </p>
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
