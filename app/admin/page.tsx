import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { getAdminUserOrNull } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import { SITE } from "@/lib/constants";
import { getAdminDashboardData } from "@/services/admin";
import { adminErrorMessage } from "@/lib/admin/action-errors";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: `Admin · ${SITE.name}`,
};

type Tab = "overview" | "venues" | "events" | "tickets" | "guestlists" | "reservations" | "premium" | "venue-accounts";

const TABS: Tab[] = [
  "overview",
  "venues",
  "events",
  "tickets",
  "guestlists",
  "reservations",
  "premium",
  "venue-accounts",
];

type Props = {
  searchParams: Promise<{
    error?: string;
    detail?: string;
    approved?: string;
    tab?: string;
    ok?: string;
    created?: string;
    reset?: string;
  }>;
};

export default async function AdminPage({ searchParams }: Props) {
  const q = await searchParams;
  const tab = (TABS.includes(q.tab as Tab) ? q.tab : "overview") as Tab;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login?next=/admin");

  const adminUser = await getAdminUserOrNull();
  if (!adminUser) {
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

  let data;
  try {
    data = await getAdminDashboardData();
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

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white">Admin CMS</h1>
        <p className="mt-1 text-sm text-white/50">Manage venues, events, tickets, and guestlists.</p>

        {q.error ? (
          <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {adminErrorMessage(q.error, q.detail)}
          </p>
        ) : null}
        {q.ok && q.tab === "guestlists" ? (
          <p className="mt-4 text-sm text-emerald-200/90">Guestlist request updated.</p>
        ) : null}
        {q.approved ? <p className="mt-4 text-sm text-emerald-200/90">Venue approved.</p> : null}
        {q.ok ? <p className="mt-4 text-sm text-emerald-200/90">Saved.</p> : null}
        {q.created ? (
          <p className="mt-4 text-sm text-emerald-200/90">
            Venue account created. Share credentials privately or send a password reset from the account row.
          </p>
        ) : null}
        {q.reset === "1" ? (
          <p className="mt-4 text-sm text-emerald-200/90">Password reset link generated (check email delivery).</p>
        ) : null}
        {data.venueAccountsError ? (
          <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
            Could not load venue accounts list: {data.venueAccountsError}
          </p>
        ) : null}

        <div className="mt-8">
          <AdminDashboard
            initialTab={tab}
            venueAccounts={data.venueAccounts}
            venues={data.venues}
            events={data.events}
            tickets={data.tickets}
            guestlists={data.guestlists}
            guestlistRequests={data.guestlistRequests}
            guestlistEntries={data.guestlistEntries}
            reservations={data.reservations}
            stats={data.stats}
          />
        </div>

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
