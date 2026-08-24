import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { signUpWithEmail } from "@/actions/auth-account";
import { SITE } from "@/lib/constants";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionaries";

export const metadata: Metadata = {
  title: `Create account · ${SITE.name}`,
  robots: { index: false, follow: false },
};

type RegisterErrorKey = "exists" | "password" | "email" | "invalid" | "generic";

type Props = { searchParams: Promise<{ error?: string; checkEmail?: string }> };

export default async function RegisterPage({ searchParams }: Props) {
  const q = await searchParams;
  const locale = await getLocale();
  const t = getDictionary(locale);
  const REGISTER_ERRORS: Record<RegisterErrorKey, string> = {
    exists: t.auth.registerErrorExists,
    password: t.auth.registerErrorPassword,
    email: t.auth.registerErrorEmail,
    invalid: t.auth.registerErrorInvalid,
    generic: t.auth.registerErrorGeneric,
  };
  const registerError = q.error && q.error in REGISTER_ERRORS ? REGISTER_ERRORS[q.error as RegisterErrorKey] : null;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white">{t.auth.createAccount}</h1>
        {q.checkEmail ? (
          <p className="mt-4 text-sm text-emerald-200/90">
            {t.auth.checkEmailConfirm}
          </p>
        ) : (
          <form action={signUpWithEmail} className="mt-6 grid gap-3">
            {registerError ? (
              <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {registerError}
              </p>
            ) : null}
            <Input name="display_name" placeholder={t.auth.displayName} autoComplete="name" />
            <Input name="email" type="email" placeholder={t.auth.email} required autoComplete="email" />
            <Input name="password" type="password" placeholder={t.auth.passwordMin6} required minLength={6} autoComplete="new-password" />
            <SubmitButton className="w-full" pendingText={t.auth.creatingAccount}>{t.auth.signUp}</SubmitButton>
          </form>
        )}
        <p className="mt-6 text-center text-sm text-white/50">
          {t.auth.alreadyHaveAccount}{" "}
          <Link href="/login" className="text-sky-300 hover:underline">
            {t.auth.logIn}
          </Link>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
