import type { Metadata } from "next";
import Link from "next/link";
import { updateVenueReservationStatus } from "@/actions/venue-manage";
import { Button } from "@/components/ui/button";
import { requireVenueUser } from "@/lib/auth/require-venue";
import { createClient } from "@/lib/supabase/server";
import {
  paymentMethodLabel,
  paymentStatusLabel,
  reservationStatusLabel,
} from "@/lib/reservations/labels";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Reservations · Venue portal · ${SITE.name}`,
};

type Props = { searchParams: Promise<{ ok?: string; error?: string }> };

export default async function VenueReservationsPage({ searchParams }: Props) {
  const q = await searchParams;
  const { venueId } = await requireVenueUser("/venue/reservations");

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("reservations")
    .select(
      "id, status, party_size, created_at, deposit_cents, payment_method, payment_status, booking_kind, notes, events(title, slug), venues(name)",
    )
    .eq("venue_id", venueId)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white">Reservations</h1>
      <p className="mt-2 text-sm text-white/55">Confirm or reject table requests for your venue.</p>
      {q.ok ? <p className="mt-4 text-sm text-emerald-200/90">Updated.</p> : null}
      {q.error ? <p className="mt-4 text-sm text-red-300">Could not update ({q.error}).</p> : null}
      <ul className="mt-8 space-y-3">
        {rows?.length ? (
          rows.map((r) => {
            const ev = r.events as { title?: string; slug?: string } | null;
            const vn = r.venues as { name?: string } | null;
            const needsAction = r.status === "pending" || r.status === "pending_payment";
            const amount =
              r.deposit_cents != null && r.deposit_cents > 0
                ? `€${(r.deposit_cents / 100).toFixed(2)}`
                : "Free";

            return (
              <li key={r.id} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-white/85">
                <p className="font-medium text-white">{ev?.title ?? "Event"}</p>
                <p className="text-xs text-white/45">
                  {vn?.name ?? "Venue"} · {r.party_size} guests · {reservationStatusLabel(r.status)}
                </p>
                <p className="mt-1 text-xs text-white/40">
                  {paymentMethodLabel(r.payment_method)} · {paymentStatusLabel(r.payment_status)} · {amount}
                  {r.booking_kind !== "table" ? ` · ${r.booking_kind}` : ""}
                </p>
                {r.notes ? <p className="mt-2 text-xs text-white/50">{r.notes}</p> : null}
                {needsAction ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <form action={updateVenueReservationStatus}>
                      <input type="hidden" name="reservation_id" value={r.id} />
                      <input type="hidden" name="status" value="confirmed" />
                      <Button type="submit" size="sm">
                        Confirm
                      </Button>
                    </form>
                    <form action={updateVenueReservationStatus}>
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
      <p className="mt-10 text-center text-sm">
        <Link href="/venue" className="text-sky-300 hover:underline">
          Back to overview
        </Link>
      </p>
    </main>
  );
}
