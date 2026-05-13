import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Checkout cancelled · ${SITE.name}`,
};

export default function CheckoutCancelPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <SiteHeader />
      <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white">No charge</h1>
        <p className="mt-3 text-sm text-white/60">Checkout was cancelled. Nothing was billed.</p>
        <Button asChild className="mt-8" variant="secondary">
          <Link href="/events">Back to events</Link>
        </Button>
      </main>
      <SiteFooter />
    </div>
  );
}
