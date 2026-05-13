import Link from "next/link";
import { signOut } from "@/actions/auth";
import { Button } from "@/components/ui/button";

export function AccountPanel({ email }: { email: string }) {
  return (
    <div className="w-full max-w-md space-y-6 rounded-3xl border border-white/10 bg-zinc-950/80 p-8 shadow-2xl backdrop-blur-xl">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white">You&apos;re in</h1>
        <p className="mt-2 text-sm text-white/55">Signed in as {email}</p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild className="flex-1">
          <Link href="/events">Browse tonight</Link>
        </Button>
        <form action={signOut} className="flex-1">
          <Button type="submit" variant="secondary" className="w-full">
            Sign out
          </Button>
        </form>
      </div>
    </div>
  );
}
