"use client";

import { Suspense, useRef, useState } from "react";
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
import { VENUE_CATEGORIES } from "@/types";
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
            <Button type="button" size="sm" onClick={() => setEditingEvent("new")}>
              Create event
            </Button>
          </div>

          {editingEvent ? (
            <EventForm
              event={editingEvent === "new" ? null : editingEvent}
              venues={venues.filter((v) => v.approved)}
              artists={artists}
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
}: {
  name: string;
  label: string;
  value: boolean | null | undefined;
  className?: string;
}) {
  const selected = value === true ? "true" : value === false ? "false" : "";
  return (
    <label className={cn("block text-sm text-white/80", className)}>
      <span className="mb-1 block text-xs text-white/45">{label}</span>
      <select
        name={name}
        defaultValue={selected}
        className="h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white"
      >
        <option value="">Inherit from venue</option>
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
  onClose,
}: {
  event: AdminEventRow | null;
  venues: AdminVenueRow[];
  artists: Artist[];
  initialArtistIds: string[];
  onClose: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
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
  const getPosterEventData = (): PosterEventData => {
    const form = formRef.current;
    const values = form ? new FormData(form) : new FormData();
    const venueId = String(values.get("venue_id") ?? "");
    const selectedVenue = venues.find((venue) => venue.id === venueId);
    const ticketFrom = String(values.get("ticket_from_eur") ?? "").trim();
    const ticketValue = Number(ticketFrom);

    return {
      title: String(values.get("title") ?? "").trim(),
      startsAt: String(values.get("starts_at") ?? "").trim(),
      venue: selectedVenue?.name,
      location: selectedVenue?.address ?? undefined,
      ticketInfo: ticketFrom && Number.isFinite(ticketValue) ? `Tickets from €${ticketValue.toLocaleString("en-GB", { maximumFractionDigits: 2 })}` : undefined,
      imageUrl: String(values.get("image_url") ?? "").trim() || undefined,
    };
  };

  return (
    <form ref={formRef} action={saveEvent} className="space-y-4 rounded-xl border border-sky-500/30 bg-sky-950/10 p-6">
      {event?.id ? <input type="hidden" name="id" value={event.id} /> : null}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white">{event ? "Edit event" : "New event"}</h3>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input name="title" placeholder="Event title" defaultValue={event?.title} required className="sm:col-span-2" />
        <select
          name="venue_id"
          defaultValue={event?.venue_id ?? ""}
          className="h-11 rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white sm:col-span-2"
        >
          <option value="">No venue</option>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
        <Input name="starts_at" type="datetime-local" required defaultValue={startsLocal} />
        <Input name="ends_at" type="datetime-local" defaultValue={endsLocal} />
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
        <Input name="city_slug" placeholder="City slug" defaultValue={event?.city_slug ?? "prishtina"} required />
        <select name="category" defaultValue={event?.category ?? "nightlife"} className="h-11 rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white">
          {EVENT_CATEGORIES.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
        </select>
        <Input name="capacity" type="number" placeholder="Capacity" defaultValue={event?.capacity ?? ""} />
        <PerformerFields initialPerformers={performers} />
        <ArtistPicker artists={artists} initialIds={initialArtistIds} className="sm:col-span-2" />
        <Input name="ticket_from_eur" type="number" step="0.01" placeholder="From price (EUR)" defaultValue={event?.ticket_from_eur ?? ""} />
        <Input name="tags" placeholder="Tags (comma-separated)" defaultValue={event?.tags?.join(", ") ?? ""} />
        <ImageUploadField name="image_url" label="Poster / cover" defaultUrl={event?.image_url ?? ""} folder="events" />
        <textarea
          name="description"
          placeholder="Description"
          defaultValue={event?.description ?? ""}
          rows={2}
          className="sm:col-span-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
        />
      </div>
      <div className="rounded-xl border border-white/10 bg-black/20 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/45">Reservation overrides</p>
        <p className="mt-1 text-xs text-white/40">
          {event?.venue_id ? "Leave inherit to use venue defaults." : "No venue — event settings are used directly (reservations default to on)."}
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <TriStateSelect
            name="reservations_enabled"
            label="Reservations open"
            value={event?.reservations_enabled}
          />
          <Input
            name="reservation_price_eur"
            type="number"
            step="0.01"
            min={0}
            placeholder="Price EUR (empty = venue)"
            defaultValue={event?.reservation_price_eur ?? ""}
          />
          <TriStateSelect
            name="requires_online_payment"
            label="Require online payment"
            value={event?.requires_online_payment}
          />
          <TriStateSelect
            name="allows_pay_at_venue"
            label="Allow pay at venue"
            value={event?.allows_pay_at_venue}
            className="sm:col-span-2"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-4 text-sm text-white/80">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="is_featured" defaultChecked={event?.is_featured} /> Featured
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="is_free" defaultChecked={event?.is_free} /> Free event
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="is_listed_public" defaultChecked={event?.is_listed_public !== false} /> Published
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="is_hidden_premium" defaultChecked={event?.is_hidden_premium} /> Premium-only
        </label>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button type="submit">Save event</Button>
        <EventPosterGenerator
          eventId={event?.id}
          posterUrl={event?.poster_url}
          getEventData={getPosterEventData}
        />
      </div>
    </form>
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
