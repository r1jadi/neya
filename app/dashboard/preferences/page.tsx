import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { PreferencesForm } from "@/components/neya/preferences-form";
import { createClient } from "@/lib/supabase/server";
import { SITE } from "@/lib/constants";
import { ArrowLeft, Check } from "lucide-react";

export const metadata: Metadata = {
  title: `Preferences · ${SITE.name}`,
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ saved?: string; error?: string }> };

export default async function PreferencesPage({ searchParams }: Props) {
  const q = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard/preferences");

  const { data: profile } = await supabase
    .from("profiles")
    .select("music_genres, interests, city_slug, age, onboarding_complete")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.onboarding_complete) redirect("/onboarding");

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <SiteHeader />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10 sm:px-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <h1 className="mt-6 font-[family-name:var(--font-display)] text-2xl font-bold text-white">
          Your preferences
        </h1>
        <p className="mt-1 text-sm text-white/55">
          Tell NEYA what you&apos;re into and we&apos;ll personalize your discovery.
        </p>

        {q.saved ? (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
            <Check className="h-4 w-4" />
            Preferences saved.
          </div>
        ) : null}
        {q.error ? (
          <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            Something went wrong. Please try again.
          </p>
        ) : null}

        <div className="mt-8">
          <PreferencesForm
            initialInterests={profile.interests ?? []}
            initialGenres={profile.music_genres ?? []}
            initialCity={profile.city_slug ?? "prishtina"}
            initialAge={profile.age ?? null}
          />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
