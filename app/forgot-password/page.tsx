import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { requestPasswordReset } from "@/actions/auth-account";
import { SITE } from "@/lib/constants";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionaries";

export const metadata: Metadata = {
  title: `Reset password · ${SITE.name}`,
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ sent?: string; error?: string }> };

export default async function ForgotPasswordPage({ searchParams }: Props) {
  const q = await searchParams;
  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white">{t.auth.resetPassword}</h1>
        <p className="mt-2 text-sm text-white/55">{t.auth.resetPasswordSub}</p>
        {q.sent ? (
          <p className="mt-6 text-sm text-emerald-200/90">{t.auth.resetSent}</p>
        ) : (
          <form action={requestPasswordReset} className="mt-6 grid gap-3">
            {q.error ? (
              <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {q.error === "invalid" ? t.auth.enterEmail : t.auth.genericError}
              </p>
            ) : null}
            <Input name="email" type="email" placeholder={t.auth.email} required autoComplete="email" />
            <SubmitButton className="w-full" pendingText={t.auth.sending}>{t.auth.sendResetLink}</SubmitButton>
          </form>
        )}
        <p className="mt-6 text-center text-sm text-white/50">
          <Link href="/login" className="text-sky-300 hover:underline">
            {t.auth.backToLogin}
          </Link>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
