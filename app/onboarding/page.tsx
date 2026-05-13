import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { completeOnboarding } from "@/actions/auth-account";
import { createClient } from "@/lib/supabase/server";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Onboarding · ${SITE.name}`,
};

const GENRES = [
  { id: "house", label: "House" },
  { id: "techno", label: "Techno" },
  { id: "afro", label: "Afro" },
  { id: "hip-hop", label: "Hip-hop" },
  { id: "r&b", label: "R&B" },
  { id: "latin", label: "Latin" },
  { id: "live", label: "Live" },
  { id: "mixed", label: "Mixed" },
];

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/onboarding");

  const { data: profile } = await supabase.from("profiles").select("onboarding_complete").eq("id", user.id).maybeSingle();
  if (profile?.onboarding_complete) redirect("/events");

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <SiteHeader />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-12 sm:px-6">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white">Dial in your taste</h1>
        <p className="mt-2 text-sm text-white/55">Pick genres you actually chase — we&apos;ll tune recommendations later.</p>
        <form action={completeOnboarding} className="mt-8 space-y-6">
          <input type="hidden" name="city_slug" value="prishtina" />
          <fieldset>
            <legend className="text-sm font-medium text-white/80">Music</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {GENRES.map((g) => (
                <label key={g.id} className="flex cursor-pointer items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white/85 has-[:checked]:border-sky-400/60 has-[:checked]:bg-sky-500/10">
                  <input type="checkbox" name="genre" value={g.id} className="rounded border-white/30" />
                  {g.label}
                </label>
              ))}
            </div>
          </fieldset>
          <Button type="submit" className="w-full">
            Save &amp; continue
          </Button>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}
