import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { AccountPanel } from "@/components/auth/account-panel";
import { LoginForm } from "@/components/auth/login-form";
import { createClient } from "@/lib/supabase/server";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Log in · ${SITE.name}`,
  description: "Sign in to NEYA — email, magic link, and Google via Supabase Auth.",
};

type Props = { searchParams: Promise<{ error?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
        {user?.email ? (
          <AccountPanel email={user.email} />
        ) : (
          <div className="w-full max-w-md space-y-6 rounded-3xl border border-white/10 bg-zinc-950/80 p-8 shadow-2xl backdrop-blur-xl">
            <div>
              <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white">Welcome back</h1>
              <p className="mt-2 text-sm text-white/55">
                Password, magic link, or Google — powered by Supabase Auth.
              </p>
            </div>
            <LoginForm initialError={params.error} />
            <div className="flex justify-between text-xs text-white/45">
              <Link href="/register" className="text-sky-300 hover:underline">
                Create account
              </Link>
              <Link href="/forgot-password" className="text-sky-300 hover:underline">
                Forgot password?
              </Link>
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
