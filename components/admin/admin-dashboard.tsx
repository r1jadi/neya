"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  approveVenue,
  deleteVenue,
  deleteEvent,
  deleteGuestlist,
  deleteTicket,
  rejectVenue,
  saveEvent,
  saveGuestlist,
  saveTicket,
  saveVenue,
  updateReservationStatus,
} from "@/actions/admin-crud";
import { grantPremiumByUserId, updateEventSubmissionStatus, verifyEventSource } from "@/actions/admin-events";
import { saveCity, setCityActive } from "@/actions/admin-discovery";
import { deleteArtist, saveArtist } from "@/actions/artists";
import {
  deleteVenueHighlight,
  saveVenueHighlight,
  toggleVenueHighlight,
} from "@/actions/venue-highlights";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { EventPosterGenerator, type PosterEventData } from "@/components/admin/event-poster-generator";
import { PerformerFields } from "@/components/admin/performer-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GuestlistRequestsPanel } from "@/components/admin/guestlist-requests-panel";
import { GuestlistRosterPanel } from "@/components/admin/guestlist-roster-panel";
import { VenueAccountsPanel } from "@/components/admin/venue-accounts-panel";
import type {
  AdminEventRow,
  AdminGuestlistRow,
  AdminReservationRow,
  AdminTicketRow,
  AdminVenueRow,
  AdminEventSourceRow,
  AdminCityRow,
} from "@/services/admin";
import { PLACES_TYPES, VENUE_CATEGORIES } from "@/types";
import type { GuestlistRequestWithEvent } from "@/types/guestlist";
import type { VenueAccountRow } from "@/types/auth";
import { formatEventWhen, getThisWeekYmdRange, todayYmdInTz, utcIsoToDatetimeLocal } from "@/lib/event-dates";
import {
  paymentMethodLabel,
  paymentStatusLabel,
  reservationStatusLabel,
} from "@/lib/reservations/labels";
import { cn } from "@/lib/utils";
import { MUSIC_GENRES } from "@/types";
import { EVENT_CATEGORIES } from "@/lib/discovery";
import type { Artist, VenueHighlight } from "@/types";

type Tab = "overview" | "venues" | "events" | "artists" | "venue-highlights" | "tickets" | "guestlists" | "reservations" | "premium" | "venue-accounts" | "guides" | "discovery";

interface AdminDashboardProps {
  initialTab: Tab;
  /** "ok" query param value — used to close forms after a save redirect. */
  initialSaveStamp?: string;
  hideNav?: boolean;
  venueAccounts: VenueAccountRow[];
  eventSources: AdminEventSourceRow[];
  cities: AdminCityRow[];
  venues: AdminVenueRow[];
  events: AdminEventRow[];
  tickets: AdminTicketRow[];
  guestlists: AdminGuestlistRow[];
  guestlistRequests: GuestlistRequestWithEvent[];
  reservations: AdminReservationRow[];
  artists: Artist[];
  eventArtistIds: Record<string, string[]>;
  highlights: VenueHighlight[];
  stats: {
    venueCount: number;
    approvedVenues: number;
    pendingVenues: number;
    eventCount: number;
    listedEvents: number;
    analyticsRows: number;
  };
}

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "venues", label: "Venues" },
  { id: "events", label: "Events" },
  { id: "artists", label: "Artists" },
  { id: "venue-highlights", label: "Venue highlights" },
  { id: "tickets", label: "Tickets" },
  { id: "guestlists", label: "Guestlists" },
  { id: "reservations", label: "Reservations" },
  { id: "premium", label: "Premium" },
  { id: "venue-accounts", label: "Venue accounts" },
  { id: "guides", label: "Guides" },
  { id: "discovery", label: "Discovery" },
];

function venueLabel(v: AdminVenueRow) {
  if (v.rejected) return "Rejected";
  if (v.approved) return "Live";
  return "Pending";
}

function venueName(ev: AdminEventRow) {
  const vn = ev.venues;
  if (Array.isArray(vn)) return vn[0]?.name ?? "—";
  return vn?.name ?? "—";
}

export function AdminDashboard({
  initialTab,
  initialSaveStamp,
  hideNav,
  venueAccounts,
  eventSources,
  cities,
  venues,
  events,
  tickets,
  guestlists,
  guestlistRequests,
  reservations,
  artists,
  eventArtistIds,
  highlights,
  stats,
}: AdminDashboardProps) {
  const [editingVenue, setEditingVenue] = useState<AdminVenueRow | "new" | null>(null);
  const [editingEvent, setEditingEvent] = useState<AdminEventRow | "new" | null>(null);
  const [editingArtist, setEditingArtist] = useState<Artist | "new" | null>(null);
  const [editingHighlight, setEditingHighlight] = useState<VenueHighlight | "new" | null>(null);
  // Server-action saves redirect back to /admin?tab=…&ok=1. That soft
  // navigation keeps this client component mounted, so without this the just-
  // used form would stay open and the next "Create event" click would recycle
  // a stale form (previous title/prices/checkbox states). Closing on a new
  // save stamp guarantees every save starts from a clean form.
  const [saveStamp, setSaveStamp] = useState(initialSaveStamp);
  useEffect(() => {
    if (initialSaveStamp !== saveStamp) {
      setSaveStamp(initialSaveStamp);
      setEditingVenue(null);
      setEditingEvent(null);
      setEditingArtist(null);
      setEditingHighlight(null);
    }
  }, [initialSaveStamp, saveStamp]);
  // A fresh key per "Create" click so a second create never reuses the
  // previous (possibly abandoned) form's DOM state.
  const [createNonce, setCreateNonce] = useState(0);
  const tab = initialTab;

  return (
    <div className="space-y-8">
      {!hideNav ? (
        <nav className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <Link
              key={t.id}
              href={`/admin?tab=${t.id}`}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition",
                tab === t.id ? "bg-white text-black" : "border border-white/15 text-white/70 hover:text-white",
              )}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      ) : null}

      {tab === "overview" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: "Venues", value: stats.venueCount, sub: `${stats.approvedVenues} live · ${stats.pendingVenues} pending` },
            { label: "Events", value: stats.eventCount, sub: `${stats.listedEvents} public` },
            { label: "Analytics rows", value: stats.analyticsRows, sub: "Stored metrics" },
          ].map((c) => (
            <div key={c.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-xs uppercase tracking-wider text-white/45">{c.label}</p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-white">{c.value}</p>
              <p className="mt-1 text-xs text-white/50">{c.sub}</p>
            </div>
          ))}
          <div className="rounded-xl border border-violet-500/20 bg-violet-950/20 p-5 sm:col-span-2 lg:col-span-3">
            <p className="text-sm text-white/70">
              Content is fully database-driven. Add venues and events here — the homepage and listings update after save.
            </p>
          </div>
        </div>
      ) : null}

      {tab === "discovery" ? <DiscoveryPanel cities={cities} /> : null}

      {tab === "venues" ? (
        <section className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white">Venues</h2>
            <Button type="button" size="sm" onClick={() => setEditingVenue("new")}>
              Create venue
            </Button>
          </div>

          {editingVenue ? (
            <VenueForm venue={editingVenue === "new" ? null : editingVenue} onClose={() => setEditingVenue(null)} />
          ) : null}

          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase text-white/45">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Flags</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {venues.map((v) => (
                  <tr key={v.id} className="border-b border-white/5">
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{v.name}</p>
                      <p className="text-xs text-white/40">{v.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-white/70">{venueLabel(v)}</td>
                    <td className="px-4 py-3 text-xs text-white/50">
                      {v.is_featured ? "Featured · " : ""}
                      {v.is_trending ? "Trending" : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="secondary" onClick={() => setEditingVenue(v)}>
                          Edit
                        </Button>
                        {!v.approved && !v.rejected ? (
                          <form action={approveVenue}>
                            <input type="hidden" name="id" value={v.id} />
                            <Button type="submit" size="sm">
                              Approve
                            </Button>
                          </form>
                        ) : null}
                        {!v.rejected ? (
                          <form action={rejectVenue}>
                            <input type="hidden" name="id" value={v.id} />
                            <Button type="submit" size="sm" variant="ghost">
                              Reject
                            </Button>
                          </form>
                        ) : null}
                        <form action={deleteVenue}>
                          <input type="hidden" name="id" value={v.id} />
                          <Button type="submit" size="sm" variant="ghost" className="text-red-300">
                            Delete
                          </Button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!venues.length ? <p className="p-6 text-sm text-white/45">No venues yet. Create one above.</p> : null}
          </div>
        </section>
      ) : null}

      {tab === "events" ? (
        <section className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white">Events</h2>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setCreateNonce((n) => n + 1);
                setEditingEvent("new");
              }}
            >
              Create event
            </Button>
          </div>

          {editingEvent ? (
            <EventForm
              key={editingEvent === "new" ? `new-${createNonce}` : editingEvent.id}
              event={editingEvent === "new" ? null : editingEvent}
              venues={venues.filter((v) => v.approved)}
              artists={artists}
              tickets={tickets}
              initialArtistIds={
                editingEvent === "new" ? [] : (eventArtistIds[editingEvent.id] ?? [])
              }
              onClose={() => setEditingEvent(null)}
            />
          ) : null}

          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase text-white/45">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Venue</th>
                  <th className="px-4 py-3">Starts</th>
                  <th className="px-4 py-3">Moderation</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr key={ev.id} className="border-b border-white/5">
                    <td className="px-4 py-3 font-medium text-white">{ev.title}</td>
                    <td className="px-4 py-3 text-white/60">{venueName(ev)}</td>
                    <td className="px-4 py-3 text-xs text-white/50">{formatEventWhen(ev.starts_at)}</td>
                    <td className="px-4 py-3 text-xs text-white/50"><form action={updateEventSubmissionStatus} className="flex items-center gap-2"><input type="hidden" name="event_id" value={ev.id} /><select name="submission_status" defaultValue={ev.submission_status ?? (ev.is_listed_public ? "published" : "approved")} className="rounded border border-white/10 bg-black/40 px-2 py-1 text-xs text-white"><option value="draft">Draft</option><option value="submitted">Submitted</option><option value="pending_review">Pending review</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="published">Published</option><option value="archived">Archived</option></select><Button type="submit" size="sm" variant="ghost">Save</Button></form>{ev.organizer_email ? <span className="mt-1 block text-white/35">{ev.organizer_name ?? "Organizer"} · {ev.organizer_email}</span> : null}{eventSources.filter((source) => source.event_id === ev.id).map((source) => <form key={source.id} action={verifyEventSource} className="mt-1 flex flex-wrap items-center gap-2"><input type="hidden" name="source_id" value={source.id} /><input type="hidden" name="verified" value={String(!source.is_verified)} /><a href={source.url} target="_blank" rel="noopener noreferrer" className="max-w-32 truncate text-sky-300 hover:underline">{source.label ?? source.source_type}</a>{!source.is_verified ? <Input name="verification_note" placeholder="Evidence reviewed" required className="h-7 w-36 text-xs" /> : <span className="text-emerald-200">Verified: {source.verification_note}</span>}<Button type="submit" size="sm" variant="ghost">{source.is_verified ? "Unverify" : "Verify"}</Button></form>)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="secondary" onClick={() => setEditingEvent(ev)}>
                          Edit
                        </Button>
                        <Button asChild size="sm" variant="ghost">
                          <Link href={`/events/${ev.slug}`}>View</Link>
                        </Button>
                        <form action={deleteEvent}>
                          <input type="hidden" name="id" value={ev.id} />
                          <Button type="submit" size="sm" variant="ghost" className="text-red-300">
                            Delete
                          </Button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!events.length ? <p className="p-6 text-sm text-white/45">No events yet.</p> : null}
          </div>
        </section>
      ) : null}

      {tab === "artists" ? (
        <section className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white">Artists</h2>
            <Button type="button" size="sm" onClick={() => setEditingArtist("new")}>
              Create artist
            </Button>
          </div>

          {editingArtist ? (
            <ArtistForm
              artist={editingArtist === "new" ? null : editingArtist}
              onClose={() => setEditingArtist(null)}
            />
          ) : null}

          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase text-white/45">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Genres</th>
                  <th className="px-4 py-3">Flags</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {artists.map((a) => (
                  <tr key={a.id} className="border-b border-white/5">
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{a.name}</p>
                      <p className="text-xs text-white/40">{a.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-white/50">
                      {a.genres.length ? a.genres.join(", ") : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-white/50">
                      {a.is_active ? "Active" : "Inactive"}
                      {a.is_verified ? " · Verified" : ""}
                      {a.is_featured ? " · Featured" : ""}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="secondary" onClick={() => setEditingArtist(a)}>
                          Edit
                        </Button>
                        <Button asChild size="sm" variant="ghost">
                          <Link href={`/artists/${a.slug}`}>View</Link>
                        </Button>
                        <form action={deleteArtist}>
                          <input type="hidden" name="id" value={a.id} />
                          <Button type="submit" size="sm" variant="ghost" className="text-red-300">
                            Delete
                          </Button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!artists.length ? <p className="p-6 text-sm text-white/45">No artists yet. Create one above.</p> : null}
          </div>
        </section>
      ) : null}

      {tab === "venue-highlights" ? (
        <VenueHighlightsPanel
          venues={venues}
          events={events}
          highlights={highlights}
          editing={editingHighlight}
          onEdit={setEditingHighlight}
        />
      ) : null}

      {tab === "tickets" ? (
        <section className="space-y-6">
          <TicketForm events={events} />
          <ul className="space-y-2">
            {tickets.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 px-4 py-3 text-sm">
                <span className="text-white">
                  {t.tier_name} — €{(t.price_cents / 100).toFixed(2)}
                  <span className="text-white/40"> · event {t.event_id.slice(0, 8)}…</span>
                </span>
                <form action={deleteTicket}>
                  <input type="hidden" name="id" value={t.id} />
                  <Button type="submit" size="sm" variant="ghost" className="text-red-300">
                    Delete
                  </Button>
                </form>
              </li>
            ))}
            {!tickets.length ? <p className="text-sm text-white/45">No ticket tiers.</p> : null}
          </ul>
        </section>
      ) : null}

      {tab === "guestlists" ? (
        <section className="space-y-8">
          <GuestlistForm events={events} />
          <Suspense fallback={<p className="text-sm text-white/45">Loading requests…</p>}>
            <GuestlistRequestsPanel requests={guestlistRequests} events={events} />
          </Suspense>
          <GuestlistRosterPanel
            approvedRequests={guestlistRequests.filter(
              (r) => r.status === "approved" || r.status === "checked_in",
            )}
            events={events}
          />
          <div>
            <h3 className="mb-3 text-sm font-semibold text-white">Event guestlists</h3>
          <ul className="space-y-2">
            {guestlists.map((g) => (
              <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 px-4 py-3 text-sm">
                <span className="text-white">
                  {g.name}
                  {g.is_vip ? " (VIP)" : ""}
                  <span className="text-white/40"> · cap {g.capacity ?? "∞"}</span>
                </span>
                <form action={deleteGuestlist}>
                  <input type="hidden" name="id" value={g.id} />
                  <Button type="submit" size="sm" variant="ghost" className="text-red-300">
                    Delete
                  </Button>
                </form>
              </li>
            ))}
            {!guestlists.length ? <p className="text-sm text-white/45">No guestlists.</p> : null}
          </ul>
          </div>
        </section>
      ) : null}

      {tab === "reservations" ? (
        <section className="space-y-4">
          {reservations.map((r) => {
            const evTitle = Array.isArray(r.events) ? r.events[0]?.title : r.events?.title;
            const venName = Array.isArray(r.venues) ? r.venues[0]?.name : r.venues?.name;
            return (
              <div key={r.id} className="rounded-xl border border-white/10 px-4 py-4 text-sm">
                <p className="font-medium text-white">
                  {evTitle ?? "Event"} @ {venName ?? "Venue"}
                </p>
                <p className="text-xs text-white/45">
                  Party {r.party_size} · {reservationStatusLabel(r.status)} ·{" "}
                  {new Date(r.created_at).toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-white/40">
                  {paymentMethodLabel(r.payment_method)} · {paymentStatusLabel(r.payment_status)}
                  {r.deposit_cents != null && r.deposit_cents > 0
                    ? ` · €${(r.deposit_cents / 100).toFixed(2)}`
                    : " · Free"}
                  {r.booking_kind !== "table" ? ` · ${r.booking_kind}` : ""}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(["confirmed", "rejected", "cancelled"] as const).map((status) => (
                    <form key={status} action={updateReservationStatus}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="status" value={status} />
                      <Button type="submit" size="sm" variant="secondary">
                        {status}
                      </Button>
                    </form>
                  ))}
                </div>
              </div>
            );
          })}
          {!reservations.length ? <p className="text-sm text-white/45">No reservations.</p> : null}
        </section>
      ) : null}

      {tab === "premium" ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
          <p className="text-sm text-white/70">Grant premium on a profile by user UUID.</p>
          <form action={grantPremiumByUserId} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Input name="user_id" placeholder="User UUID" required className="font-mono text-xs" />
            <Button type="submit">Grant premium</Button>
          </form>
        </div>
      ) : null}

      {tab === "venue-accounts" ? (
        <Suspense fallback={<p className="text-sm text-white/45">Loading venue accounts…</p>}>
          <VenueAccountsPanel initialAccounts={venueAccounts} venues={venues} />
        </Suspense>
      ) : null}
    </div>
  );
}

function TriStateSelect({
  name,
  label,
  value,
  className,
  hideInherit = false,
}: {
  name: string;
  label: string;
  value: boolean | null | undefined;
  className?: string;
  /** Hide "Inherit from venue" — used when no venue is selected (nothing to inherit). */
  hideInherit?: boolean;
}) {
  // Venue-less events have nothing to inherit, so the select's default is the
  // concrete fallback saveEvent applies when the value is unset (reservations
  // open, online payment optional, pay-at-venue allowed). Venue-linked events
  // default to "Inherit from venue". Call sites pass a key that remounts the
  // select when a venue is picked/unpicked, so a default picked while
  // venue-less can never leak into a venue-linked save and vice versa.
  const venueLessDefault = name === "requires_online_payment" ? "false" : "true";
  const selected = value === true ? "true" : value === false ? "false" : hideInherit ? venueLessDefault : "";
  return (
    <label className={cn("block text-sm text-white/80", className)}>
      <span className="mb-1 block text-xs text-white/45">{label}</span>
      <select
        name={name}
        defaultValue={selected}
        className="h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white"
      >
        {hideInherit ? null : <option value="">Inherit from venue</option>}
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    </label>
  );
}

function DiscoveryPanel({ cities }: { cities: AdminCityRow[] }) {
  const [editingCity, setEditingCity] = useState<AdminCityRow | "new" | null>(null);
  const countries = Array.from(new Map(cities.map((city) => [city.country_slug, city.country_name])).entries());
  const regions = Array.from(new Map(cities.map((city) => [city.region_slug, city.region_name])).entries());
  const city = editingCity && editingCity !== "new" ? editingCity : null;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Discovery geography &amp; taxonomy</h2>
          <p className="mt-1 text-sm text-white/50">Cities carry their country and region. Activate a city only after it has real NEYA activity.</p>
        </div>
        <Button type="button" size="sm" onClick={() => setEditingCity("new")}>Add city</Button>
      </div>

      {editingCity ? (
        <form action={saveCity} className="space-y-4 rounded-xl border border-fuchsia-500/30 bg-fuchsia-950/10 p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white">{city ? `Edit ${city.name}` : "New city"}</h3>
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditingCity(null)}>Close</Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input name="name" placeholder="City name" defaultValue={city?.name} required />
            <Input name="slug" placeholder="city-slug" defaultValue={city?.slug} required />
            <Input name="country_name" placeholder="Country name" defaultValue={city?.country_name} required />
            <Input name="country_slug" placeholder="country-slug" defaultValue={city?.country_slug} required />
            <Input name="region_name" placeholder="Region name" defaultValue={city?.region_name} required />
            <Input name="region_slug" placeholder="region-slug" defaultValue={city?.region_slug} required />
            <Input name="latitude" type="number" step="any" placeholder="Latitude (optional)" defaultValue={city?.latitude ?? ""} />
            <Input name="longitude" type="number" step="any" placeholder="Longitude (optional)" defaultValue={city?.longitude ?? ""} />
          </div>
          <label className="flex items-center gap-2 text-sm text-white/80"><input name="is_active" type="checkbox" defaultChecked={city?.is_active ?? false} /> Active in public discovery</label>
          <Button type="submit">Save city</Button>
        </form>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 p-4">
          <h3 className="text-sm font-semibold text-white">Countries</h3>
          <p className="mt-1 text-xs text-white/45">Managed through city records.</p>
          <div className="mt-3 flex flex-wrap gap-2">{countries.length ? countries.map(([slug, name]) => <span key={slug} className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-white/70">{name}</span>) : <span className="text-sm text-white/45">No countries yet.</span>}</div>
        </div>
        <div className="rounded-xl border border-white/10 p-4">
          <h3 className="text-sm font-semibold text-white">Regions</h3>
          <p className="mt-1 text-xs text-white/45">Managed through city records.</p>
          <div className="mt-3 flex flex-wrap gap-2">{regions.length ? regions.map(([slug, name]) => <span key={slug} className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-white/70">{name}</span>) : <span className="text-sm text-white/45">No regions yet.</span>}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase text-white/45"><tr><th className="px-4 py-3">City</th><th className="px-4 py-3">Country / region</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr></thead>
          <tbody>{cities.map((item) => <tr key={item.slug} className="border-b border-white/5"><td className="px-4 py-3"><p className="font-medium text-white">{item.name}</p><p className="text-xs text-white/40">{item.slug}</p></td><td className="px-4 py-3 text-xs text-white/60">{item.country_name} · {item.region_name}</td><td className="px-4 py-3"><span className={item.is_active ? "text-emerald-200" : "text-white/45"}>{item.is_active ? "Active" : "Inactive"}</span></td><td className="px-4 py-3"><div className="flex gap-2"><Button type="button" size="sm" variant="secondary" onClick={() => setEditingCity(item)}>Edit</Button><form action={setCityActive}><input type="hidden" name="slug" value={item.slug} /><input type="hidden" name="active" value={String(!item.is_active)} /><Button type="submit" size="sm" variant="ghost">{item.is_active ? "Deactivate" : "Activate"}</Button></form></div></td></tr>)}</tbody>
        </table>
        {!cities.length ? <p className="p-6 text-sm text-white/45">No cities yet. Add a city before publishing discovery there.</p> : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 p-4">
          <h3 className="text-sm font-semibold text-white">Event categories</h3>
          <p className="mt-1 text-xs text-white/45">The production-safe category set used by event forms and filters.</p>
          <div className="mt-3 flex flex-wrap gap-2">{EVENT_CATEGORIES.map((category) => <span key={category.id} className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-white/70">{category.label}</span>)}</div>
        </div>
        <div className="rounded-xl border border-white/10 p-4">
          <h3 className="text-sm font-semibold text-white">Genres</h3>
          <p className="mt-1 text-xs text-white/45">The production-safe genre set used by event forms and filters.</p>
          <div className="mt-3 flex max-h-36 flex-wrap gap-2 overflow-y-auto">{MUSIC_GENRES.map((genre) => <span key={genre.id} className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-white/70">{genre.label}</span>)}</div>
        </div>
      </div>
    </section>
  );
}

function VenueForm({ venue, onClose }: { venue: AdminVenueRow | null; onClose: () => void }) {
  const gallery = Array.isArray(venue?.gallery_urls) ? venue.gallery_urls.join(", ") : "";
  const genres = venue?.music_genres?.join(", ") ?? "";
  const dayParts = venue?.day_parts?.join(", ") ?? "";
  const placesTypes = venue?.places_types ?? [];
  const social = venue?.social_links ? JSON.stringify(venue.social_links) : "";

  return (
    <form action={saveVenue} className="space-y-4 rounded-xl border border-violet-500/30 bg-violet-950/10 p-6">
      {venue?.id ? <input type="hidden" name="id" value={venue.id} /> : null}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white">{venue ? "Edit venue" : "New venue"}</h3>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input name="name" placeholder="Venue name" defaultValue={venue?.name} required />
        <select
          name="category"
          defaultValue={venue?.category ?? "nightclub"}
          className="h-11 rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white"
        >
          {venue?.category === "club" ? <option value="club">Club (legacy)</option> : null}
          {VENUE_CATEGORIES.map((category) => (
            <option key={category.id} value={category.id}>
              {category.label}
            </option>
          ))}
        </select>
        <Input name="address" placeholder="Address" defaultValue={venue?.address ?? ""} className="sm:col-span-2" />
        <Input name="lat" type="number" step="any" placeholder="Latitude" defaultValue={venue?.lat ?? ""} />
        <Input name="lng" type="number" step="any" placeholder="Longitude" defaultValue={venue?.lng ?? ""} />
        <textarea
          name="description"
          placeholder="Description"
          defaultValue={venue?.description ?? ""}
          rows={3}
          className="sm:col-span-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
        />
        <ImageUploadField name="image_url" label="Cover image" defaultUrl={venue?.image_url ?? ""} folder="venues" />
        <Input name="gallery_urls" placeholder="Gallery URLs (comma-separated)" defaultValue={gallery} className="sm:col-span-2" />
        <Input name="music_genres" placeholder="Music genres (comma-separated)" defaultValue={genres} />
        <Input name="day_parts" placeholder="Day parts: morning, daytime, evening, late_night" defaultValue={dayParts} className="sm:col-span-2" />
        <div className="rounded-xl border border-white/10 bg-black/20 p-4 sm:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/45">Places sections</p>
          <p className="mt-1 text-xs text-white/40">
            This place appears on /places under every section selected here (&quot;All&quot; always includes it). Leave empty to keep automatic inference from day parts and category.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {PLACES_TYPES.map((type) => (
              <label
                key={type.id}
                className="flex cursor-pointer items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:border-white/30 hover:text-white"
              >
                <input
                  type="checkbox"
                  name="places_types"
                  value={type.id}
                  defaultChecked={placesTypes.includes(type.id)}
                  className="h-3.5 w-3.5"
                />
                {type.label}
              </label>
            ))}
          </div>
        </div>
        <Input name="capacity" type="number" min={0} placeholder="Venue capacity" defaultValue={venue?.capacity ?? ""} />
        <Input name="website_url" type="url" placeholder="Website URL" defaultValue={venue?.website_url ?? ""} />
        <Input name="contact_email" type="email" placeholder="Contact email" defaultValue={venue?.contact_email ?? ""} />
        <Input name="contact_phone" type="tel" placeholder="Contact phone" defaultValue={venue?.contact_phone ?? ""} />
        <Input name="social_links" placeholder='Social links JSON e.g. {"instagram":"@neya"}' defaultValue={social} className="sm:col-span-2 font-mono text-xs" />
        <Input name="price_level" type="number" min={1} max={4} placeholder="Price level 1-4" defaultValue={venue?.price_level ?? 2} />
      </div>
      <div className="flex flex-wrap gap-4 text-sm text-white/80">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="approved" defaultChecked={venue?.approved ?? true} /> Approved
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="is_featured" defaultChecked={venue?.is_featured} /> Featured
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="is_trending" defaultChecked={venue?.is_trending} /> Trending
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="reservations_enabled" defaultChecked={venue?.reservations_enabled ?? true} /> Reservations
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="vip_enabled" defaultChecked={venue?.vip_enabled} /> VIP
        </label>
      </div>
      <div className="rounded-xl border border-white/10 bg-black/20 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/45">Reservation pricing</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Input
            name="reservation_price_eur"
            type="number"
            step="0.01"
            min={0}
            placeholder="Price (EUR, 0 = free)"
            defaultValue={venue?.reservation_price_eur ?? 0}
          />
          <label className="flex items-center gap-2 text-sm text-white/80">
            <input type="checkbox" name="requires_online_payment" defaultChecked={venue?.requires_online_payment} /> Require online payment
          </label>
          <label className="flex items-center gap-2 text-sm text-white/80 sm:col-span-2">
            <input type="checkbox" name="allows_pay_at_venue" defaultChecked={venue?.allows_pay_at_venue ?? true} /> Allow pay at venue
          </label>
        </div>
      </div>
      <Button type="submit">Save venue</Button>
    </form>
  );
}

function EventForm({
  event,
  venues,
  artists,
  initialArtistIds,
  tickets,
  onClose,
}: {
  event: AdminEventRow | null;
  venues: AdminVenueRow[];
  artists: Artist[];
  initialArtistIds: string[];
  tickets: AdminTicketRow[];
  onClose: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const eventTickets = event?.id ? tickets.filter((t) => t.event_id === event.id) : [];
  const originalTicketIds = eventTickets.map((t) => t.id);
  const [tiers, setTiers] = useState<EventTicketDraft[]>(() =>
    eventTickets.map((t) => ({
      key: t.id,
      id: t.id,
      tier_name: t.tier_name,
      price_eur: String(t.price_cents / 100),
      quantity_total: t.quantity_total != null ? String(t.quantity_total) : "",
      description: t.description ?? "",
    })),
  );
  const cheapestTierEur = (() => {
    const prices = tiers
      .map((t) => Number(t.price_eur))
      .filter((n) => Number.isFinite(n) && n >= 0);
    return prices.length ? Math.min(...prices) : null;
  })();
  // Single source of truth for entry pricing: "Free" and ticket types are
  // mutually exclusive in the form. Switching to Free clears the ticket
  // types; switching to paid adds a first (empty) ticket type. The hidden
  // is_free field mirrors the choice; the server additionally normalizes
  // legacy rows where paid tiers and is_free=on coexist.
  // Prefill: paid tiers already configured always win over a stale Free flag.
  const [isFree, setIsFree] = useState<boolean>(() =>
    eventTickets.some((t) => t.price_cents > 0) ? false : (event?.is_free ?? eventTickets.length === 0),
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [capacitySource, setCapacitySource] = useState<"venue" | "custom">(() =>
    event?.capacity != null && event.capacity > 0 ? "custom" : "venue",
  );
  const addTier = () => {
    setTiers((previous) => [
      ...previous,
      {
        key: `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        tier_name: "",
        price_eur: "",
        quantity_total: "",
        description: "",
      },
    ]);
    setFormError(null);
  };
  const ticketsJson = JSON.stringify(
    tiers.map((t) => ({
      id: t.id || undefined,
      tier_name: t.tier_name.trim(),
      price_cents: Math.round((Number(t.price_eur) || 0) * 100),
      quantity_total: t.quantity_total.trim() === "" ? null : Number(t.quantity_total),
      description: t.description.trim(),
    })),
  );
  const performers = event?.performers?.length
    ? event.performers
    : event?.dj_lineup?.map((name) => ({ name })) ?? [];
  const legacyGenreMap: Record<string, string> = {
    afro: "afro_house",
    "hip-hop": "hip_hop",
    "r&b": "r_and_b",
    live: "live_music",
    mixed: "other",
  };
  const selectedGenre = event?.genre
    ? legacyGenreMap[event.genre] ?? (MUSIC_GENRES.some((option) => option.id === event.genre) ? event.genre : "other")
    : "other";
  const startsLocal = event?.starts_at ? utcIsoToDatetimeLocal(event.starts_at) : "";
  const endsLocal = event?.ends_at ? utcIsoToDatetimeLocal(event.ends_at) : "";
  const initialImageUrl = event?.image_url ?? "";
  const [generatedPosterUrl, setGeneratedPosterUrl] = useState<string | null>(null);
  const [manualImageUrl, setManualImageUrl] = useState(initialImageUrl);
  const [selectedVenueId, setSelectedVenueId] = useState(event?.venue_id ?? "");
  const hasVenue = Boolean(selectedVenueId);
  const selectedVenue = venues.find((v) => v.id === selectedVenueId);
  // A generated poster becomes the event's poster unless the admin manually
  // picked a different image in the Poster / cover field.
  const useGeneratedPoster = Boolean(generatedPosterUrl && manualImageUrl === initialImageUrl);

  async function handleEventSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = formRef.current;
    if (!form) return;

    // A ticket type needs a name and a price — otherwise it is silently
    // dropped server-side today, which loses the admin's configuration.
    const invalid = tiers.some((tier) => {
      const errs = tierFieldErrors(tier);
      return Boolean(errs.name || errs.price);
    });
    if (invalid) {
      setFormError("Fix the highlighted ticket types — each needs a name and a price (€0 allowed).");
      const firstBad = [...form.querySelectorAll<HTMLElement>('[data-tier-field="name"]')].find((el) => {
        const index = Number(el.getAttribute("data-tier-index"));
        return Boolean(tierFieldErrors(tiers[index] ?? { tier_name: "", price_eur: "", quantity_total: "", description: "" }).name);
      });
      firstBad?.scrollIntoView({ block: "center", behavior: "smooth" });
      firstBad?.focus();
      return;
    }
    // Duplicate tier names confuse users (two "GA" cards). The backend also
    // rejects this; mirror the check here for a clear inline error.
    const lowerNames = tiers.map((t) => t.tier_name.trim().toLowerCase()).filter(Boolean);
    const dup = lowerNames.some((name, i) => lowerNames.indexOf(name) !== i);
    if (dup) {
      setFormError("Two ticket types share the same name — give each a unique name.");
      return;
    }
    setFormError(null);

    const fd = new FormData(form);
    // Paid ticket types always win over a stale "Free" flag (legacy rows).
    fd.set("is_free", tiers.some((tier) => (Number(tier.price_eur) || 0) * 100 > 0) ? "off" : isFree ? "on" : "off");
    // When inheriting the venue's capacity, the DB stores NULL (venue default).
    // Venue-less events have nothing to inherit, so the typed value is kept.
    if (hasVenue && capacitySource === "venue") fd.set("capacity", "");
    if (useGeneratedPoster && generatedPosterUrl) {
      fd.set("image_url", generatedPosterUrl);
    }
    // Venue-less events need a custom location: without one, users would see
    // an event with no place. The backend also rejects this.
    if (!hasVenue && !String(fd.get("venue_name") ?? "").trim()) {
      setFormError("Add a custom location (or pick a venue) — an event with no location can\u2019t be saved.");
      return;
    }
    // An end before the start is nonsensical. The backend also rejects it.
    const startsVal = String(fd.get("starts_at") ?? "").trim();
    const endsVal = String(fd.get("ends_at") ?? "").trim();
    if (startsVal && endsVal) {
      const s = new Date(startsVal).getTime();
      const en = new Date(endsVal).getTime();
      if (Number.isFinite(s) && Number.isFinite(en) && en <= s) {
        setFormError("The end time must be after the start time.");
        return;
      }
    }
    await saveEvent(fd);
  }

  const getPosterEventData = (): PosterEventData => {
    const form = formRef.current;
    const values = form ? new FormData(form) : new FormData();
    const venueId = String(values.get("venue_id") ?? "");
    const selectedVenue = venues.find((venue) => venue.id === venueId);
    const customLocation = String(values.get("venue_name") ?? "").trim();
    // The poster reflects the same price the event page shows: the cheapest
    // ticket type when types exist, otherwise the manual listing price.
    const ticketInfo =
      cheapestTierEur != null
        ? `Tickets from €${cheapestTierEur.toLocaleString("en-GB", { maximumFractionDigits: 2 })}`
        : (() => {
            const manual = String(values.get("ticket_from_eur") ?? "").trim();
            const parsed = Number(manual);
            return manual && Number.isFinite(parsed) ? `Tickets from €${parsed.toLocaleString("en-GB", { maximumFractionDigits: 2 })}` : undefined;
          })();

    return {
      title: String(values.get("title") ?? "").trim(),
      startsAt: String(values.get("starts_at") ?? "").trim(),
      venue: selectedVenue?.name ?? (customLocation || undefined),
      location: selectedVenue?.address ?? (customLocation || undefined),
      ticketInfo,
      imageUrl: String(values.get("image_url") ?? "").trim() || undefined,
    };
  };

  return (
    <form ref={formRef} action={saveEvent} onSubmit={handleEventSubmit} className="space-y-4 rounded-xl border border-sky-500/30 bg-sky-950/10 p-6">
      {event?.id ? <input type="hidden" name="id" value={event.id} /> : null}
      <input type="hidden" name="tickets_json" value={ticketsJson} />
      <input type="hidden" name="tickets_original_ids" value={originalTicketIds.join(",")} />
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white">{event ? "Edit event" : "New event"}</h3>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>

      <FormSection title="Basics" hint="Where and what this night is.">
        <Input name="title" placeholder="Event title" defaultValue={event?.title} required className="sm:col-span-2" />
        <select
          name="venue_id"
          value={selectedVenueId}
          onChange={(e) => setSelectedVenueId(e.target.value)}
          className="h-11 rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white sm:col-span-2"
        >
          <option value="">No venue — use a custom location below</option>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
        {!hasVenue ? (
          <div className="sm:col-span-2">
            <Input
              name="venue_name"
              placeholder="Custom location (e.g. Prishtina City Park)"
              defaultValue={event?.venue_name ?? ""}
              maxLength={160}
            />
            <p className="mt-1 text-xs text-white/40">
              Shown to users as the event&apos;s location. No NEYA Venue record is created.
            </p>
          </div>
        ) : null}
      </FormSection>

      <FormSection title="Date &amp; time" hint="Local Prishtina time — users see the same start time everywhere.">
        <Input name="starts_at" type="datetime-local" required defaultValue={startsLocal} />
        <Input name="ends_at" type="datetime-local" defaultValue={endsLocal} />
      </FormSection>

      <FormSection title="Details" hint="Genre, category and tags shape discovery filters.">
        <select
          name="genre"
          defaultValue={selectedGenre}
          className="h-11 rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white"
        >
          {MUSIC_GENRES.map((genre) => (
            <option key={genre.id} value={genre.id}>
              {genre.label}
            </option>
          ))}
        </select>
        <select name="category" defaultValue={event?.category ?? "nightlife"} className="h-11 rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white">
          {EVENT_CATEGORIES.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
        </select>
        <Input name="city_slug" placeholder="City slug" defaultValue={event?.city_slug ?? "prishtina"} required />
        <Input name="tags" placeholder="Tags (comma-separated)" defaultValue={event?.tags?.join(", ") ?? ""} />
        <div className="sm:col-span-2">
          <PerformerFields initialPerformers={performers} />
        </div>
        <ArtistPicker artists={artists} initialIds={initialArtistIds} className="sm:col-span-2" />
      </FormSection>

      <FormSection
        title="Entry &amp; pricing"
        hint="Choose how people get in. This single decision drives every surface: homepage cards, the event page and the checkout all show the same price."
      >
        <div className="sm:col-span-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setIsFree(true);
                if (tiers.length && !window.confirm("Switching to a free event removes all configured ticket types. Continue?")) {
                  setIsFree(false);
                  return;
                }
                if (tiers.length) setTiers([]);
                setFormError(null);
              }}
              aria-pressed={isFree}
              className={cn(
                "rounded-xl border p-3 text-left transition",
                isFree ? "border-emerald-400/60 bg-emerald-500/10" : "border-white/10 bg-white/[0.02] hover:border-white/25",
              )}
            >
              <span className="block text-sm font-semibold text-white">Free event</span>
              <span className="mt-0.5 block text-xs text-white/50">No tickets — users just show up. Shown as “Free” on cards and the event page.</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsFree(false);
                if (!tiers.length) addTier();
                setFormError(null);
              }}
              aria-pressed={!isFree}
              className={cn(
                "rounded-xl border p-3 text-left transition",
                !isFree ? "border-sky-400/60 bg-sky-500/10" : "border-white/10 bg-white/[0.02] hover:border-white/25",
              )}
            >
              <span className="block text-sm font-semibold text-white">Paid event with tickets</span>
              <span className="mt-0.5 block text-xs text-white/50">Users pick a ticket type below and pay its exact price online.</span>
            </button>
          </div>
          <input type="hidden" name="is_free" value={isFree ? "on" : "off"} />
        </div>

        {isFree && tiers.length ? (
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100 sm:col-span-2">
            This event is marked Free but already has paid ticket types — saving it will keep the tickets and treat it as a paid event
            (ticket prices always win on the event page). Switch to “Paid event with tickets” to keep pricing explicit.
          </p>
        ) : null}

        {!isFree ? (
          tiers.length ? (
            <div className="space-y-2 sm:col-span-2">
              <TicketTiersEditor tiers={tiers} onChange={setTiers} onAdd={addTier} clearError={() => setFormError(null)} />
              <p className="text-xs text-white/40">
                The listing price (“From €…” on cards) is derived from the cheapest ticket type automatically — no separate field to keep in sync.
              </p>
            </div>
          ) : (
            <div className="space-y-2 sm:col-span-2">
              <Input
                name="ticket_from_eur"
                type="number"
                step="0.01"
                min={0}
                placeholder="Listing price (EUR)"
                defaultValue={event?.ticket_from_eur ?? ""}
              />
              <p className="text-xs text-white/40">
                No ticket types yet — cards show this price. Add ticket types above to sell tickets online.
              </p>
            </div>
          )
        ) : null}
      </FormSection>

      <FormSection
        title="Reservations &amp; capacity"
        hint={
          hasVenue
            ? "\u201CInherit\u201D uses the venue's defaults; picking Yes/No overrides them for this event only."
            : "Same settings as venue events — apply directly to this event. An empty reservation price means Free."
        }
      >
        <TriStateSelect
          key={`res-enabled-${hasVenue ? "venue" : "none"}`}
          name="reservations_enabled"
          label="Reservations open"
          value={event?.reservations_enabled}
          hideInherit={!hasVenue}
        />
        <Input
          name="reservation_price_eur"
          type="number"
          step="0.01"
          min={0}
          placeholder={hasVenue ? "Price EUR (empty = venue)" : "Price EUR (0 = free)"}
          defaultValue={hasVenue ? event?.reservation_price_eur ?? "" : (event?.reservation_price_eur ?? 0)}
        />
        <TriStateSelect
          key={`res-online-${hasVenue ? "venue" : "none"}`}
          name="requires_online_payment"
          label="Require online payment"
          value={event?.requires_online_payment}
          hideInherit={!hasVenue}
        />
        <TriStateSelect
          key={`res-pav-${hasVenue ? "venue" : "none"}`}
          name="allows_pay_at_venue"
          label="Allow pay at venue"
          value={event?.allows_pay_at_venue}
          hideInherit={!hasVenue}
        />
        <div className="sm:col-span-2">
          <span className="mb-1 block text-xs text-white/45">Maximum guests (optional)</span>
          {hasVenue ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setCapacitySource("venue")}
                aria-pressed={capacitySource === "venue"}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                  capacitySource === "venue"
                    ? "border-sky-400/60 bg-sky-500/10 text-white"
                    : "border-white/15 text-white/60 hover:border-white/30 hover:text-white",
                )}
              >
                Use venue&apos;s capacity
              </button>
              <button
                type="button"
                onClick={() => setCapacitySource("custom")}
                aria-pressed={capacitySource === "custom"}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                  capacitySource === "custom"
                    ? "border-sky-400/60 bg-sky-500/10 text-white"
                    : "border-white/15 text-white/60 hover:border-white/30 hover:text-white",
                )}
              >
                Set a number
              </button>
            </div>
          ) : null}
          {!hasVenue || capacitySource === "custom" ? (
            <Input
              name="capacity"
              type="number"
              min={1}
              placeholder={hasVenue ? "e.g. 400" : "e.g. 400 (blank = unknown)"}
              defaultValue={event?.capacity ?? ""}
              className="mt-2"
              aria-label="Maximum guests"
            />
          ) : (
            <input type="hidden" name="capacity" value="" />
          )}
          <p className="mt-2 text-xs text-white/40">
            {hasVenue && capacitySource === "venue"
              ? `Guests are limited to the venue's capacity (${selectedVenue?.capacity != null ? `${selectedVenue.capacity} people` : "not set on the venue yet"}). Ticket sales and reservations are capped by it.`
              : "Guests are limited to this number: ticket sales and reservations are capped by it. Shown on the event page."}
          </p>
        </div>
      </FormSection>

      <FormSection title="Poster &amp; description" hint="The poster is the hero image on the event page.">
        <div className="sm:col-span-2">
          <ImageUploadField
            name="image_url"
            label="Poster / cover"
            defaultUrl={initialImageUrl}
            folder="events"
            onUrlChange={setManualImageUrl}
          />
        </div>
        {useGeneratedPoster ? (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/25 bg-emerald-950/20 px-3 py-2 sm:col-span-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={generatedPosterUrl ?? ""} alt="Generated poster" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
            <p className="text-xs leading-5 text-emerald-100/90">
              Generated poster will be saved as the event poster. Upload a different image in &ldquo;Poster / cover&rdquo; to override it.
            </p>
          </div>
        ) : null}
        <textarea
          name="description"
          placeholder="Description"
          defaultValue={event?.description ?? ""}
          rows={3}
          className="sm:col-span-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
        />
      </FormSection>

      <FormSection title="Publishing" hint="When the event is live and who sees it.">
        <label className="flex items-center gap-2 text-sm text-white/80">
          {/* The hidden field guarantees an "off" value when the box is
              unchecked (a bare checkbox contributes NOTHING to FormData, so
              the server would otherwise always publish). Order matters: when
              checked, the checkbox's "on" must be the FIRST value so
              formData.get() reads it; an unchecked box leaves only "off". */}
          <input type="checkbox" name="is_listed_public" defaultChecked={event?.is_listed_public !== false} /> Published (visible on the site)
          <input type="hidden" name="is_listed_public" value="off" />
        </label>
        <label className="flex items-center gap-2 text-sm text-white/80">
          <input type="checkbox" name="is_featured" defaultChecked={event?.is_featured} /> Featured
        </label>
        <label className="flex items-center gap-2 text-sm text-white/80 sm:col-span-2">
          <input type="checkbox" name="is_hidden_premium" defaultChecked={event?.is_hidden_premium} /> Premium-only (hidden from free listings)
        </label>
      </FormSection>

      {formError ? (
        <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {formError}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button type="submit">Save event</Button>
        <EventPosterGenerator
          eventId={event?.id}
          posterUrl={event?.poster_url}
          getEventData={getPosterEventData}
          onPosterGenerated={(url) => setGeneratedPosterUrl(url)}
        />
      </div>
    </form>
  );
}

type EventTicketDraft = {
  key: string;
  id?: string;
  tier_name: string;
  price_eur: string;
  quantity_total: string;
  description: string;
};

function tierFieldErrors(tier: EventTicketDraft): { name?: string; price?: string } {
  const errors: { name?: string; price?: string } = {};
  if (!tier.tier_name.trim()) errors.name = "Ticket type needs a name.";
  const price = tier.price_eur.trim() === "" ? Number.NaN : Number(tier.price_eur);
  if (!Number.isFinite(price) || price < 0) errors.price = "Enter a price (0 allowed).";
  return errors;
}

function TicketTiersEditor({
  tiers,
  onChange,
  onAdd,
  clearError,
}: {
  tiers: EventTicketDraft[];
  onChange: (tiers: EventTicketDraft[]) => void;
  onAdd: () => void;
  clearError: () => void;
}) {
  function update(index: number, patch: Partial<EventTicketDraft>) {
    onChange(tiers.map((tier, i) => (i === index ? { ...tier, ...patch } : tier)));
  }
  function remove(index: number) {
    onChange(tiers.filter((_, i) => i !== index));
  }
  function add() {
    onAdd();
  }

  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-white/45">Ticket types</p>
      <p className="mt-1 text-xs text-white/40">
        {tiers.length
          ? `${tiers.length} tier${tiers.length === 1 ? "" : "s"} — users pick one of these and pay its exact price online.`
          : "No ticket types yet — add one below."}
      </p>
      {tiers.length ? (
        <ul className="mt-3 space-y-2">
          {tiers.map((tier, index) => {
            const fieldErrors = tierFieldErrors(tier);
            return (
              <li
                key={tier.key}
                className={
                  fieldErrors.name || fieldErrors.price
                    ? "grid gap-2 rounded-lg border border-red-500/40 bg-red-950/10 p-3 sm:grid-cols-[minmax(0,1fr)_110px_110px_auto]"
                    : "grid gap-2 rounded-lg border border-white/10 bg-white/[0.02] p-3 sm:grid-cols-[minmax(0,1fr)_110px_110px_auto]"
                }
              >
                <div>
                  <Input
                    value={tier.tier_name}
                    onChange={(e) => {
                      update(index, { tier_name: e.target.value });
                      clearError();
                    }}
                    placeholder="Tier name (e.g. Early Bird)"
                    aria-label={`Tier ${index + 1} name`}
                    aria-invalid={Boolean(fieldErrors.name)}
                    data-tier-field="name"
                    data-tier-index={index}
                  />
                  {fieldErrors.name ? <p className="mt-1 text-xs text-red-300" data-tier-error>Missing a name</p> : null}
                </div>
                <div>
                  <Input
                    value={tier.price_eur}
                    onChange={(e) => {
                      update(index, { price_eur: e.target.value });
                      clearError();
                    }}
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="€ price"
                    aria-label={`Tier ${index + 1} price`}
                    aria-invalid={Boolean(fieldErrors.price)}
                    data-tier-field="price"
                    data-tier-index={index}
                    className="h-11 rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white"
                  />
                  {fieldErrors.price ? <p className="mt-1 text-xs text-red-300">Needs a price (0 allowed)</p> : null}
                </div>
                <Input
                  value={tier.quantity_total}
                  onChange={(e) => update(index, { quantity_total: e.target.value })}
                  type="number"
                  min={0}
                  placeholder="Qty (blank = ∞)"
                  aria-label={`Tier ${index + 1} quantity`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(index)}
                  className="text-red-300"
                  aria-label={`Remove tier ${index + 1}`}
                >
                  Remove
                </Button>
                <Input
                  value={tier.description}
                  onChange={(e) => update(index, { description: e.target.value })}
                  placeholder="Description (optional)"
                  className="sm:col-span-4"
                  aria-label={`Tier ${index + 1} description`}
                />
              </li>
            );
          })}
        </ul>
      ) : null}
      <Button type="button" size="sm" variant="secondary" onClick={add} className="mt-3">
        + Add ticket type
      </Button>
    </div>
  );
}

function FormSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-white/45">{title}</p>
      {hint ? <p className="mt-1 text-xs text-white/40">{hint}</p> : null}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function ArtistPicker({
  artists,
  initialIds,
  className,
}: {
  artists: Artist[];
  initialIds: string[];
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialIds));

  const visible = artists.filter((a) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      a.name.toLowerCase().includes(q) ||
      a.genres.some((g) => g.toLowerCase().includes(q))
    );
  });

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className={cn("rounded-xl border border-white/10 bg-black/20 p-4", className)}>
      <p className="text-xs font-semibold uppercase tracking-wider text-white/45">
        Artists / lineup
      </p>
      <p className="mt-1 text-xs text-white/40">
        {selected.size} selected — links these artists&apos; profiles to the event.
      </p>
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search artists…"
        aria-label="Search artists"
        className="mt-3"
      />
      <input type="hidden" name="artist_ids" value={[...selected].join(",")} />
      {visible.length ? (
        <ul className="mt-3 max-h-56 space-y-1 overflow-y-auto pr-1">
          {visible.map((a) => {
            const checked = selected.has(a.id);
            return (
              <li key={a.id}>
                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition",
                    checked
                      ? "border-sky-400/40 bg-sky-500/10 text-white"
                      : "border-white/10 bg-white/[0.02] text-white/70 hover:border-white/25",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(a.id)}
                    className="h-4 w-4 accent-sky-400"
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {a.name}
                    {!a.is_active ? <span className="ml-1 text-xs text-white/40">(inactive)</span> : null}
                  </span>
                  {a.genres.length ? (
                    <span className="truncate text-xs text-white/40">{a.genres.slice(0, 2).join(" · ")}</span>
                  ) : null}
                </label>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-white/40">
          {artists.length ? "No artists match your search." : "No artists yet — create them in the Artists tab."}
        </p>
      )}
    </div>
  );
}

function ArtistForm({ artist, onClose }: { artist: Artist | null; onClose: () => void }) {
  const genres = artist?.genres?.join(", ") ?? "";

  return (
    <form action={saveArtist} className="space-y-4 rounded-xl border border-fuchsia-500/30 bg-fuchsia-950/10 p-6">
      {artist?.id ? <input type="hidden" name="id" value={artist.id} /> : null}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white">{artist ? "Edit artist" : "New artist"}</h3>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input name="name" placeholder="Artist / DJ name" defaultValue={artist?.name ?? ""} required className="sm:col-span-2" />
        <textarea
          name="short_bio"
          placeholder="Short bio / tagline (shows on cards)"
          defaultValue={artist?.short_bio ?? ""}
          rows={2}
          className="sm:col-span-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
        />
        <textarea
          name="bio"
          placeholder="Full bio"
          defaultValue={artist?.bio ?? ""}
          rows={4}
          className="sm:col-span-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
        />
        <Input name="genres" placeholder="Genres (comma-separated), e.g. house, techno" defaultValue={genres} className="sm:col-span-2" />
        <ImageUploadField name="profile_image" label="Profile image" defaultUrl={artist?.profile_image ?? ""} folder="artists" />
        <ImageUploadField name="cover_image" label="Cover image" defaultUrl={artist?.cover_image ?? ""} folder="artists" />
        <Input name="instagram_url" type="url" placeholder="Instagram URL" defaultValue={artist?.instagram_url ?? ""} />
        <Input name="spotify_url" type="url" placeholder="Spotify URL" defaultValue={artist?.spotify_url ?? ""} />
        <Input name="soundcloud_url" type="url" placeholder="SoundCloud URL" defaultValue={artist?.soundcloud_url ?? ""} />
        <Input name="website_url" type="url" placeholder="Website URL" defaultValue={artist?.website_url ?? ""} />
      </div>
      <div className="flex flex-wrap gap-4 text-sm text-white/80">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="is_verified" defaultChecked={artist?.is_verified ?? false} /> Verified
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="is_featured" defaultChecked={artist?.is_featured ?? false} /> Featured
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="is_active" defaultChecked={artist?.is_active ?? true} /> Active (visible on site)
        </label>
      </div>
      <Button type="submit">Save artist</Button>
    </form>
  );
}

function formatYmdShort(ymd: string): string {
  return new Date(`${ymd}T12:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function highlightStatus(highlight: VenueHighlight, today: string): { label: string; tone: string } {
  if (!highlight.is_active) return { label: "Inactive", tone: "text-white/40" };
  if (highlight.week_start > today) return { label: "Upcoming", tone: "text-sky-200/90" };
  if (highlight.week_end < today) return { label: "Expired", tone: "text-white/40" };
  return { label: "Active now", tone: "text-emerald-200/90" };
}

function VenueHighlightsPanel({
  venues,
  events,
  highlights,
  editing,
  onEdit,
}: {
  venues: AdminVenueRow[];
  events: AdminEventRow[];
  highlights: VenueHighlight[];
  editing: VenueHighlight | "new" | null;
  onEdit: (value: VenueHighlight | "new" | null) => void;
}) {
  const [today] = useState(() => todayYmdInTz());

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Venue highlights</h2>
          <p className="mt-1 text-xs text-white/45">
            Short weekly updates shown on venue pages and the homepage. One active highlight per venue
            per week — publishing a new one replaces the previous.
          </p>
        </div>
        <Button type="button" size="sm" onClick={() => onEdit("new")}>
          Publish highlight
        </Button>
      </div>

      {editing ? (
        <HighlightForm
          highlight={editing === "new" ? null : editing}
          venues={venues}
          events={events}
          onClose={() => onEdit(null)}
        />
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase text-white/45">
            <tr>
              <th className="px-4 py-3">Venue</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Week</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {highlights.map((h) => {
              const status = highlightStatus(h, today);
              return (
                <tr key={h.id} className="border-b border-white/5">
                  <td className="px-4 py-3 text-white/70">{h.venue?.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{h.title}</p>
                    {h.event ? (
                      <p className="text-xs text-white/40">→ {h.event.title}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-xs text-white/50">
                    {formatYmdShort(h.week_start)} – {formatYmdShort(h.week_end)}
                  </td>
                  <td className={cn("px-4 py-3 text-xs font-medium", status.tone)}>{status.label}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="secondary" onClick={() => onEdit(h)}>
                        Edit
                      </Button>
                      <form action={toggleVenueHighlight}>
                        <input type="hidden" name="id" value={h.id} />
                        <Button type="submit" size="sm" variant="ghost">
                          {h.is_active ? "Deactivate" : "Activate"}
                        </Button>
                      </form>
                      <form action={deleteVenueHighlight}>
                        <input type="hidden" name="id" value={h.id} />
                        <Button type="submit" size="sm" variant="ghost" className="text-red-300">
                          Delete
                        </Button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!highlights.length ? (
          <p className="p-6 text-sm text-white/45">
            No highlights yet — publish this week&apos;s update for a venue above.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function HighlightForm({
  highlight,
  venues,
  events,
  onClose,
}: {
  highlight: VenueHighlight | null;
  venues: AdminVenueRow[];
  events: AdminEventRow[];
  onClose: () => void;
}) {
  const thisWeek = useState(() => getThisWeekYmdRange())[0];
  const [venueId, setVenueId] = useState(highlight?.venue_id ?? "");
  const [eventId, setEventId] = useState(highlight?.event_id ?? "");
  const venueEvents = events.filter((e) => e.venue_id === venueId);

  return (
    <form action={saveVenueHighlight} className="space-y-4 rounded-xl border border-amber-500/30 bg-amber-950/10 p-6">
      {highlight?.id ? <input type="hidden" name="id" value={highlight.id} /> : null}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white">
          {highlight ? "Edit highlight" : "New weekly highlight"}
        </h3>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <select
          name="venue_id"
          value={venueId}
          required
          onChange={(e) => {
            setVenueId(e.target.value);
            setEventId("");
          }}
          className="h-11 rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white sm:col-span-2"
        >
          <option value="">Select venue…</option>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
              {!v.approved || v.rejected ? " (not live)" : ""}
            </option>
          ))}
        </select>
        <Input
          name="title"
          placeholder="Title — e.g. DJ Example this Friday"
          defaultValue={highlight?.title ?? ""}
          required
          maxLength={120}
          className="sm:col-span-2"
        />
        <textarea
          name="content"
          placeholder="Update — e.g. DJ Example takes over the booth this Friday from 22:00."
          defaultValue={highlight?.content ?? ""}
          required
          rows={3}
          maxLength={600}
          className="sm:col-span-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
        />
        <ImageUploadField
          name="image_url"
          label="Image (optional)"
          defaultUrl={highlight?.image_url ?? ""}
          folder="highlights"
        />
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs text-white/45">Week starts</span>
            <Input
              name="week_start"
              type="date"
              defaultValue={highlight?.week_start ?? thisWeek.startYmd}
              required
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-white/45">Week ends</span>
            <Input
              name="week_end"
              type="date"
              defaultValue={highlight?.week_end ?? thisWeek.endYmd}
              required
            />
          </label>
        </div>
        <select
          name="event_id"
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          className="h-11 rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white sm:col-span-2"
        >
          <option value="">No linked event</option>
          {venueEvents.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title}
            </option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm text-white/80">
        <input type="checkbox" name="is_active" defaultChecked={highlight?.is_active ?? true} />
        Active (shown on the site this week)
      </label>
      <Button type="submit">{highlight ? "Save changes" : "Publish highlight"}</Button>
    </form>
  );
}

function TicketForm({ events }: { events: AdminEventRow[] }) {
  return (
    <form action={saveTicket} className="grid gap-3 rounded-xl border border-white/10 p-4 sm:grid-cols-2">
      <h3 className="sm:col-span-2 text-sm font-semibold text-white">Add ticket tier</h3>
      <select name="event_id" required className="h-11 rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white sm:col-span-2">
        <option value="">Event</option>
        {events.map((e) => (
          <option key={e.id} value={e.id}>
            {e.title}
          </option>
        ))}
      </select>
      <Input name="tier_name" placeholder="Tier name" required />
      <Input name="price_cents" type="number" placeholder="Price (cents)" required />
      <Input name="description" placeholder="Description (optional)" className="sm:col-span-2" />
      <Input name="quantity_total" type="number" placeholder="Quantity" />
      <select name="status" defaultValue="available" className="h-11 rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white">
        <option value="available">Available</option><option value="sold_out">Sold out</option><option value="closed">Closed</option>
      </select>
      <Button type="submit" className="sm:col-span-2">
        Add ticket
      </Button>
    </form>
  );
}

function GuestlistForm({ events }: { events: AdminEventRow[] }) {
  return (
    <form action={saveGuestlist} className="grid gap-3 rounded-xl border border-white/10 p-4 sm:grid-cols-2">
      <h3 className="sm:col-span-2 text-sm font-semibold text-white">Add guestlist</h3>
      <select name="event_id" required className="h-11 rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white sm:col-span-2">
        <option value="">Event</option>
        {events.map((e) => (
          <option key={e.id} value={e.id}>
            {e.title}
          </option>
        ))}
      </select>
      <Input name="name" placeholder="List name" required />
      <Input name="capacity" type="number" placeholder="Capacity" />
      <label className="flex items-center gap-2 text-sm text-white/80">
        <input type="checkbox" name="is_vip" /> VIP list
      </label>
      <label className="flex items-center gap-2 text-sm text-white/80">
        <input type="checkbox" name="is_open" defaultChecked /> Open for requests
      </label>
      <label className="flex items-center gap-2 text-sm text-white/80 sm:col-span-2">
        <input type="checkbox" name="requires_manual_approval" defaultChecked /> Manual approval required
      </label>
      <Button type="submit" className="sm:col-span-2">
        Add guestlist
      </Button>
    </form>
  );
}
