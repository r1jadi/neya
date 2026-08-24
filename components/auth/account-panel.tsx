import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Button } from "@/components/ui/button";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionaries";

export async function AccountPanel({ email }: { email: string }) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  return (
    <div className="w-full max-w-md space-y-6 rounded-3xl border border-white/10 bg-zinc-950/80 p-8 shadow-2xl backdrop-blur-xl">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white">{t.auth.youreIn}</h1>
        <p className="mt-2 text-sm text-white/55">{t.auth.signedInAs} {email}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Button asChild className="col-span-2 sm:col-span-1">
          <Link href="/events">{t.common.tonight}</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/dashboard">{t.common.dashboard}</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/onboarding">{t.auth.prefs}</Link>
        </Button>
        <SignOutButton variant="secondary" wrapperClassName="col-span-2 sm:col-span-1" />
      </div>
    </div>
  );
}
