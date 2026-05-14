import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { updateReservationStatus } from "@/actions/business-manage";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Reservations · Venue hub · ${SITE.name}`,
};

type Props = { searchParams: Promise<{ ok?: string; error?: string }> };

export default async function BusinessReservationsPage({ searchParams }: Props) {
  const q = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/business/reservations");

  const { data: venues } = await supabase.from("venues").select("id").eq("owner_id", user.id);
  const ids = venues?.map((v) => v.id) ?? [];
  const { data: rows } =
    ids.length > 0
      ? await supabase
          .from("reservations")
          .select("id, status, party_size, created_at, deposit_cents, notes, events(title, slug), venues(name)")
          .in("venue_id", ids)
          .order("created_at", { ascending: false })
          .limit(50)
      : { data: [] as never[] };

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white">Reservations</h1>
      <p className="mt-2 text-sm text-white/55">Confirm or reject table requests for your venues.</p>
      {q.ok ? (
        <p className="mt-4 text-sm text-emerald-200/90">Updated.</p>
      ) : null}
      {q.error ? (
        <p className="mt-4 text-sm text-red-300">Could not update ({q.error}).</p>
      ) : null}
      <ul className="mt-8 space-y-3">
        {rows?.length ? (
          rows.map((r) => {
            const ev = r.events as { title?: string; slug?: string } | null;
            const vn = r.venues as { name?: string } | null;
            return (
              <li key={r.id} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-white/85">
                <p className="font-medium text-white">{ev?.title ?? "Event"}</p>
                <p className="text-xs text-white/45">{vn?.name ?? "Venue"} · {r.party_size} guests · {r.status}</p>
                {r.notes ? <p className="mt-2 text-xs text-white/50">{r.notes}</p> : null}
                {r.status === "pending" ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <form action={updateReservationStatus}>
                      <input type="hidden" name="reservation_id" value={r.id} />
                      <input type="hidden" name="status" value="confirmed" />
                      <Button type="submit" size="sm">
                        Confirm
                      </Button>
                    </form>
                    <form action={updateReservationStatus}>
                      <input type="hidden" name="reservation_id" value={r.id} />
                      <input type="hidden" name="status" value="rejected" />
                      <Button type="submit" size="sm" variant="secondary">
                        Reject
                      </Button>
                    </form>
                  </div>
                ) : null}
                {ev?.slug ? (
                  <Link href={`/events/${ev.slug}`} className="mt-2 inline-block text-xs text-sky-300 hover:underline">
                    View event
                  </Link>
                ) : null}
              </li>
            );
          })
        ) : (
          <li className="text-sm text-white/45">No reservations yet.</li>
        )}
      </ul>
    </main>
  );
}
