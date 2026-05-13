import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestPasswordReset } from "@/actions/auth-account";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Reset password · ${SITE.name}`,
};

type Props = { searchParams: Promise<{ sent?: string; error?: string }> };

export default async function ForgotPasswordPage({ searchParams }: Props) {
  const q = await searchParams;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white">Reset password</h1>
        <p className="mt-2 text-sm text-white/55">We&apos;ll email you a link to set a new password.</p>
        {q.sent ? (
          <p className="mt-6 text-sm text-emerald-200/90">If that email exists, you&apos;ll get a message shortly.</p>
        ) : (
          <form action={requestPasswordReset} className="mt-6 grid gap-3">
            {q.error ? <p className="text-sm text-red-300">{q.error}</p> : null}
            <Input name="email" type="email" placeholder="Email" required autoComplete="email" />
            <Button type="submit">Send reset link</Button>
          </form>
        )}
        <p className="mt-6 text-center text-sm text-white/50">
          <Link href="/login" className="text-sky-300 hover:underline">
            Back to login
          </Link>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
