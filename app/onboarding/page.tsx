import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/layout/site-footer";
import { OnboardingFlow } from "@/components/neya/onboarding-flow";
import { createClient } from "@/lib/supabase/server";
import { SITE } from "@/lib/constants";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionaries";

export const metadata: Metadata = {
  title: `Welcome to ${SITE.name}`,
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ error?: string }> };

export default async function OnboardingPage({ searchParams }: Props) {
  const q = await searchParams;
  const locale = await getLocale();
  const t = getDictionary(locale);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/onboarding");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_complete")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.onboarding_complete) redirect("/events");

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      {q.error ? (
        <div className="mx-auto mt-4 w-full max-w-lg px-4">
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {t.onboarding.error}
          </p>
        </div>
      ) : null}
      <main className="mx-auto flex w-full flex-1 flex-col justify-center px-4 py-16 sm:px-6">
        <OnboardingFlow />
      </main>
      <SiteFooter />
    </div>
  );
}
