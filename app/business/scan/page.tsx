import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { validateTicketAtDoor } from "@/actions/validate-ticket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/server";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Scan tickets · Venue hub · ${SITE.name}`,
};

type Props = { searchParams: Promise<{ ok?: string; error?: string; info?: string }> };

export default async function BusinessScanPage({ searchParams }: Props) {
  const q = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/business/scan");

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10 sm:px-6">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white">Door scan</h1>
      <p className="mt-2 text-sm text-white/55">Paste the QR payload from the buyer&apos;s dashboard after Stripe paid.</p>
      {q.ok ? <p className="mt-4 text-sm text-emerald-200/90">Checked in — ticket marked used.</p> : null}
      {q.info === "already" ? <p className="mt-4 text-sm text-amber-200/90">Already scanned.</p> : null}
      {q.error ? <p className="mt-4 text-sm text-red-300">Error: {q.error}</p> : null}
      <form action={validateTicketAtDoor} className="mt-8 grid gap-3">
        <Input name="qr_payload" placeholder="neya:…" required className="font-mono text-xs" />
        <Button type="submit">Validate &amp; mark used</Button>
      </form>
    </main>
  );
}
