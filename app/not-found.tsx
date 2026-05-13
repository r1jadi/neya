import Link from "next/link";
import { NeonButton } from "@/components/neya/neon-button";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export default async function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <SiteHeader />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-white/40">404</p>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl font-bold text-white">
          This room is empty
        </h1>
        <p className="mt-3 max-w-md text-sm text-white/55">
          The night moved elsewhere. Head back to the feed or tonight&apos;s map.
        </p>
        <div className="mt-8">
          <NeonButton asChild>
            <Link href="/">Back to NEYA</Link>
          </NeonButton>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
