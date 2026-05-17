import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";

export default async function AuthCodeErrorPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <SiteHeader />
      <main className="mx-auto flex max-w-md flex-1 flex-col justify-center px-4 py-16 text-center">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white">
          Sign-in link expired
        </h1>
        <p className="mt-3 text-sm text-white/55">
          Request a new magic link or sign in with your password. Links expire after a short time for security.
        </p>
        <Button asChild className="mt-8">
          <Link href="/login">Back to login</Link>
        </Button>
      </main>
      <SiteFooter />
    </div>
  );
}
