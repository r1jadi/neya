import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signUpWithEmail } from "@/actions/auth-account";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Create account · ${SITE.name}`,
};

type Props = { searchParams: Promise<{ error?: string; checkEmail?: string }> };

export default async function RegisterPage({ searchParams }: Props) {
  const q = await searchParams;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white">Create account</h1>
        {q.checkEmail ? (
          <p className="mt-4 text-sm text-emerald-200/90">
            Check your email to confirm your address, then you can log in.
          </p>
        ) : (
          <form action={signUpWithEmail} className="mt-6 grid gap-3">
            {q.error ? (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{q.error}</p>
            ) : null}
            <Input name="display_name" placeholder="Display name" autoComplete="name" />
            <Input name="email" type="email" placeholder="Email" required autoComplete="email" />
            <Input name="password" type="password" placeholder="Password (min 6)" required minLength={6} autoComplete="new-password" />
            <Button type="submit">Sign up</Button>
          </form>
        )}
        <p className="mt-6 text-center text-sm text-white/50">
          Already have an account?{" "}
          <Link href="/login" className="text-sky-300 hover:underline">
            Log in
          </Link>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
