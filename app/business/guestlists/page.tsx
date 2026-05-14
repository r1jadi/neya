import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { updateGuestlistEntryStatus } from "@/actions/business-manage";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Guestlists · Venue hub · ${SITE.name}`,
};

type Props = { searchParams: Promise<{ ok?: string; error?: string }> };

export default async function BusinessGuestlistsPage({ searchParams }: Props) {
  const q = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/business/guestlists");

  const { data: rows } = await supabase
    .from("guestlist_entries")
    .select("id, status, contact, created_at, guestlists(name, events(title, slug))")
    .order("created_at", { ascending: false })
    .limit(80);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white">Guestlists</h1>
      <p className="mt-2 text-sm text-white/55">Approve door requests for your events.</p>
      {q.ok ? <p className="mt-4 text-sm text-emerald-200/90">Updated.</p> : null}
      {q.error ? <p className="mt-4 text-sm text-red-300">Could not update.</p> : null}
      <ul className="mt-8 space-y-3">
        {rows?.length ? (
          rows.map((r) => {
            const gl = r.guestlists as { name?: string; events?: { title?: string; slug?: string } | null } | null;
            const ev = gl?.events;
            return (
              <li key={r.id} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-white/85">
                <p className="font-medium text-white">{ev?.title ?? "Event"}</p>
                <p className="text-xs text-white/45">{gl?.name ?? "Guestlist"}</p>
                <p className="mt-2 text-white/70">{r.contact}</p>
                <p className="text-xs text-sky-200/80">{r.status}</p>
                {r.status === "pending" ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <form action={updateGuestlistEntryStatus}>
                      <input type="hidden" name="entry_id" value={r.id} />
                      <input type="hidden" name="status" value="approved" />
                      <Button type="submit" size="sm">
                        Approve
                      </Button>
                    </form>
                    <form action={updateGuestlistEntryStatus}>
                      <input type="hidden" name="entry_id" value={r.id} />
                      <input type="hidden" name="status" value="waitlist" />
                      <Button type="submit" size="sm" variant="secondary">
                        Waitlist
                      </Button>
                    </form>
                    <form action={updateGuestlistEntryStatus}>
                      <input type="hidden" name="entry_id" value={r.id} />
                      <input type="hidden" name="status" value="rejected" />
                      <Button type="submit" size="sm" variant="secondary">
                        Reject
                      </Button>
                    </form>
                  </div>
                ) : null}
                {ev?.slug ? (
                  <Link href={`/events/${ev.slug}`} className="mt-2 inline-block text-xs text-sky-300 hover:underline">
                    Event page
                  </Link>
                ) : null}
              </li>
            );
          })
        ) : (
          <li className="text-sm text-white/45">No guestlist entries yet.</li>
        )}
      </ul>
    </main>
  );
}
