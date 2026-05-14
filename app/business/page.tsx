import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createVenueEvent, requestVenueListing } from "@/actions/business";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/server";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Venue hub · ${SITE.name}`,
};

const GENRES = ["house", "techno", "afro", "hip-hop", "r&b", "latin", "live", "mixed"];

type Props = { searchParams: Promise<{ error?: string; created?: string; event?: string }> };

export default async function BusinessPage({ searchParams }: Props) {
  const q = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/business");

  const { data: venues } = await supabase
    .from("venues")
    .select("id, name, slug, approved, city_slug")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white">Venue hub</h1>
        <p className="mt-2 text-sm text-white/55">
          Request a new listing (pending admin approval) and publish events for venues you own.
        </p>

        {q.created ? (
          <p className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
            Venue submitted — NEYA admins will review shortly.
          </p>
        ) : null}
        {q.event ? (
          <p className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
            Event created and is live in your database feed.
          </p>
        ) : null}
        {q.error ? (
          <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            Something went wrong ({q.error}). Try again.
          </p>
        ) : null}

        <section className="mt-10 space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-lg font-semibold text-white">Request venue listing</h2>
          <form action={requestVenueListing} className="grid gap-3">
            <Input name="name" placeholder="Venue name" required maxLength={120} />
            <label className="text-xs text-white/60">
              Category
              <select
                name="category"
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-sm text-white"
                defaultValue="club"
              >
                <option value="club">Club</option>
                <option value="lounge">Lounge</option>
                <option value="bar">Bar</option>
                <option value="rooftop">Rooftop</option>
                <option value="cafe">Café</option>
                <option value="live_music">Live music</option>
                <option value="festival">Festival</option>
              </select>
            </label>
            <Input name="address" placeholder="Address (optional)" maxLength={240} />
            <textarea
              name="description"
              placeholder="Short pitch for the city"
              maxLength={2000}
              rows={3}
              className="rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-sm text-white placeholder:text-white/35"
            />
            <Button type="submit">Submit for review</Button>
          </form>
        </section>

        <section className="mt-10 space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-lg font-semibold text-white">Your venues</h2>
          {venues?.length ? (
            <ul className="space-y-2 text-sm text-white/80">
              {venues.map((v) => (
                <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 px-3 py-2">
                  <span className="font-medium text-white">{v.name}</span>
                  <span className="text-xs text-white/45">
                    {v.approved ? "Approved" : "Pending approval"} ·{" "}
                    <Link href={`/venues/${v.slug}`} className="text-sky-300 hover:underline">
                      /{v.slug}
                    </Link>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-white/45">No venues linked yet — submit a listing above.</p>
          )}
        </section>

        <section className="mt-10 space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-lg font-semibold text-white">Create event</h2>
          {venues?.length ? (
            <form action={createVenueEvent} className="grid gap-3">
              <label className="text-xs text-white/60">
                Venue
                <select
                  name="venue_id"
                  required
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-sm text-white"
                >
                  {venues.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} {!v.approved ? "(pending)" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <Input name="title" placeholder="Event title" required maxLength={160} />
              <label className="text-xs text-white/60">
                Starts
                <Input name="starts_at" type="datetime-local" required className="mt-1" />
              </label>
              <label className="text-xs text-white/60">
                Genre
                <select
                  name="genre"
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-sm text-white"
                  defaultValue="mixed"
                >
                  {GENRES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </label>
              <Button type="submit">Publish event</Button>
            </form>
          ) : (
            <p className="text-sm text-white/45">Create a venue first.</p>
          )}
        </section>

        <p className="mt-10 text-center text-sm">
          <Link href="/events" className="text-sky-300 hover:underline">
            Browse public feed
          </Link>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
