import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { approveVenue } from "@/actions/admin-venues";
import { grantPremiumByUserId, toggleEventFeatured, toggleEventListed, toggleEventPremiumHidden } from "@/actions/admin-events";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/auth/admin";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Admin · ${SITE.name}`,
};

type Props = {
  searchParams: Promise<{ error?: string; approved?: string; tab?: string; ok?: string }>;
};

export default async function AdminPage({ searchParams }: Props) {
  const q = await searchParams;
  const tab = q.tab ?? "venues";
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

  const { data: events } = await admin
    .from("events")
    .select("id, slug, title, is_featured, is_hidden_premium, is_listed_public, venues(name)")
    .order("starts_at", { ascending: false })
    .limit(40);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white">Admin</h1>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/admin?tab=venues"
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${tab === "venues" ? "bg-white text-black" : "border border-white/15 text-white/70"}`}
          >
            Venues
          </Link>
          <Link
            href="/admin?tab=events"
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${tab === "events" ? "bg-white text-black" : "border border-white/15 text-white/70"}`}
          >
            Events
          </Link>
          <Link
            href="/admin?tab=premium"
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${tab === "premium" ? "bg-white text-black" : "border border-white/15 text-white/70"}`}
          >
            Premium
          </Link>
        </div>

        {q.error === "forbidden" ? <p className="mt-4 text-sm text-red-300">Action denied.</p> : null}
        {q.approved ? <p className="mt-4 text-sm text-emerald-200/90">Venue approved.</p> : null}
        {q.ok ? <p className="mt-4 text-sm text-emerald-200/90">Saved.</p> : null}

        {tab === "venues" ? (
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
        ) : null}

        {tab === "events" ? (
          <ul className="mt-8 space-y-4">
            {events?.length ? (
              events.map((ev) => {
                const vn = ev.venues as { name?: string } | { name?: string }[] | null;
                const venueName = Array.isArray(vn) ? vn[0]?.name : vn?.name;
                return (
                  <li key={ev.id} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm">
                    <p className="font-medium text-white">{ev.title}</p>
                    <p className="text-xs text-white/45">
                      {venueName ?? "Venue"} · {ev.slug}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <form action={toggleEventFeatured}>
                        <input type="hidden" name="event_id" value={ev.id} />
                        <input type="hidden" name="on" value={ev.is_featured ? "0" : "1"} />
                        <Button type="submit" size="sm" variant="secondary">
                          {ev.is_featured ? "Unfeature" : "Feature"}
                        </Button>
                      </form>
                      <form action={toggleEventPremiumHidden}>
                        <input type="hidden" name="event_id" value={ev.id} />
                        <input type="hidden" name="on" value={ev.is_hidden_premium ? "0" : "1"} />
                        <Button type="submit" size="sm" variant="secondary">
                          {ev.is_hidden_premium ? "Public listing" : "Premium-only"}
                        </Button>
                      </form>
                      <form action={toggleEventListed}>
                        <input type="hidden" name="event_id" value={ev.id} />
                        <input type="hidden" name="on" value={ev.is_listed_public === false ? "1" : "0"} />
                        <Button type="submit" size="sm" variant="secondary">
                          {ev.is_listed_public === false ? "List publicly" : "Hide from feed"}
                        </Button>
                      </form>
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/events/${ev.slug}`}>View</Link>
                      </Button>
                    </div>
                  </li>
                );
              })
            ) : (
              <li className="text-sm text-white/45">No events.</li>
            )}
          </ul>
        ) : null}

        {tab === "premium" ? (
          <div className="mt-8 space-y-4 rounded-xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-sm text-white/70">
              Grant <span className="text-fuchsia-200">is_premium</span> on a profile. Paste the user UUID from Supabase
              Auth → Users.
            </p>
            <form action={grantPremiumByUserId} className="flex flex-col gap-3 sm:flex-row">
              <Input name="user_id" placeholder="User UUID" required className="font-mono text-xs" />
              <Button type="submit">Grant premium</Button>
            </form>
          </div>
        ) : null}

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
