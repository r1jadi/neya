import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Log in · ${SITE.name}`,
  description: "Sign in to NEYA — email, Google, and Apple via Supabase Auth.",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
        <div className="w-full max-w-md space-y-6 rounded-3xl border border-white/10 bg-zinc-950/80 p-8 shadow-2xl backdrop-blur-xl">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-white/55">
              Auth UI shell — connect Supabase <code className="rounded bg-white/10 px-1">signInWithOAuth</code> for
              Google / Apple and magic link or password.
            </p>
          </div>
          <div className="grid gap-3">
            <Input type="email" placeholder="Email" autoComplete="email" />
            <Input type="password" placeholder="Password" autoComplete="current-password" />
            <Button type="button" className="w-full">
              Continue
            </Button>
            <Button variant="secondary" type="button" className="w-full">
              Continue with Google
            </Button>
            <Button variant="secondary" type="button" className="w-full">
              Continue with Apple
            </Button>
          </div>
          <p className="text-center text-xs text-white/45">
            <Link href="/" className="text-sky-300 hover:underline">
              ← Home
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
