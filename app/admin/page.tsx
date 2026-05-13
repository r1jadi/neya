import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { approveVenue } from "@/actions/admin-venues";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/auth/admin";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Admin · ${SITE.name}`,
};

type Props = { searchParams: Promise<{ error?: string; approved?: string }> };

export default async function AdminPage({ searchParams }: Props) {
  const q = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login?next=/admin");
  if (!isAdminEmail(user.email)) {
    return (
      <div className="flex min-h-screen flex-col bg-[var(--background)]">
        <SiteHeader />
        <main className="mx-auto max-w-lg flex-1 px-4 py-16 text-center">
          <h1 className="text-xl font-semibold text-white">Restricted</h1>
          <p className="mt-2 text-sm text-white/55">Add your email to NEYA_ADMIN_EMAILS on the server to access admin tools.</p>
        </main>
        <SiteFooter />
      </div>
    );
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return (
      <div className="flex min-h-screen flex-col bg-[var(--background)]">
        <SiteHeader />
        <main className="mx-auto max-w-lg flex-1 px-4 py-16 text-center text-sm text-red-200">
          SUPABASE_SERVICE_ROLE_KEY is required for admin listing.
        </main>
        <SiteFooter />
      </div>
    );
  }

  const { data: pending } = await admin
    .from("venues")
    .select("id, name, slug, city_slug, created_at")
    .eq("approved", false)
    .order("created_at", { ascending: false });

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white">Venue approvals</h1>
        {q.error === "forbidden" ? <p className="mt-2 text-sm text-red-300">Action denied.</p> : null}
        {q.approved ? <p className="mt-2 text-sm text-emerald-200/90">Venue approved.</p> : null}
        <ul className="mt-8 space-y-3">
          {pending?.length ? (
            pending.map((v) => (
              <li
                key={v.id}
                className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-white">{v.name}</p>
                  <p className="text-xs text-white/45">
                    {v.slug} · {v.city_slug}
                  </p>
                </div>
                <form action={approveVenue}>
                  <input type="hidden" name="venue_id" value={v.id} />
                  <Button type="submit" size="sm">
                    Approve
                  </Button>
                </form>
              </li>
            ))
          ) : (
            <li className="text-sm text-white/45">No venues waiting approval.</li>
          )}
        </ul>
        <p className="mt-10 text-center text-sm">
          <Link href="/" className="text-sky-300 hover:underline">
            Home
          </Link>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
