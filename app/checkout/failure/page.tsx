import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Payment failed · ${SITE.name}`,
};

type Props = { searchParams: Promise<{ ticket_order_id?: string }> };

export default async function CheckoutFailurePage({ searchParams }: Props) {
  await searchParams;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <SiteHeader />
      <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white">
          Payment didn&apos;t go through
        </h1>
        <p className="mt-3 text-sm text-white/60">
          You can try again from the event page, or use another card. If any charge went
          through, your tickets are confirmed automatically on your NEYA profile.
        </p>
        <Button asChild className="mt-8">
          <Link href="/events">Back to events</Link>
        </Button>
      </main>
      <SiteFooter />
    </div>
  );
}