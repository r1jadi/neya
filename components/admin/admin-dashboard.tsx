"use client";

import { useState } from "react";
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
import { grantPremiumByUserId } from "@/actions/admin-events";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  AdminEventRow,
  AdminGuestlistRow,
  AdminReservationRow,
  AdminTicketRow,
  AdminVenueRow,
} from "@/services/admin";
import { cn } from "@/lib/utils";

type Tab = "overview" | "venues" | "events" | "tickets" | "guestlists" | "reservations" | "premium";

interface AdminDashboardProps {
  initialTab: Tab;
  venues: AdminVenueRow[];
  events: AdminEventRow[];
  tickets: AdminTicketRow[];
  guestlists: AdminGuestlistRow[];
  reservations: AdminReservationRow[];
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
  { id: "tickets", label: "Tickets" },
  { id: "guestlists", label: "Guestlists" },
  { id: "reservations", label: "Reservations" },
  { id: "premium", label: "Premium" },
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
  venues,
  events,
  tickets,
  guestlists,
  reservations,
  stats,
}: AdminDashboardProps) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [editingVenue, setEditingVenue] = useState<AdminVenueRow | "new" | null>(null);
  const [editingEvent, setEditingEvent] = useState<AdminEventRow | "new" | null>(null);

  return (
    <div className="space-y-8">
      <nav className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/admin?tab=${t.id}`}
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition",
              tab === t.id ? "bg-white text-black" : "border border-white/15 text-white/70 hover:text-white",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

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
                  <th className="px-4 py-3">Visibility</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr key={ev.id} className="border-b border-white/5">
                    <td className="px-4 py-3 font-medium text-white">{ev.title}</td>
                    <td className="px-4 py-3 text-white/60">{venueName(ev)}</td>
                    <td className="px-4 py-3 text-xs text-white/50">{new Date(ev.starts_at).toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs text-white/50">
                      {ev.is_listed_public ? "Public" : "Hidden"}
                      {ev.is_featured ? " · Featured" : ""}
                    </td>
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
        <section className="space-y-6">
          <GuestlistForm events={events} />
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
                  Party {r.party_size} · {r.status} · {new Date(r.created_at).toLocaleString()}
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
    </div>
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
          defaultValue={venue?.category ?? "club"}
          className="h-11 rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white"
        >
          {["club", "lounge", "bar", "rooftop", "cafe", "live_music", "festival"].map((c) => (
            <option key={c} value={c}>
              {c}
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
      <Button type="submit">Save venue</Button>
    </form>
  );
}

function EventForm({
  event,
  venues,
  onClose,
}: {
  event: AdminEventRow | null;
  venues: AdminVenueRow[];
  onClose: () => void;
}) {
  const lineup = event?.dj_lineup?.join(", ") ?? "";
  const startsLocal = event?.starts_at ? event.starts_at.slice(0, 16) : "";
  const endsLocal = event?.ends_at ? event.ends_at.slice(0, 16) : "";

  return (
    <form action={saveEvent} className="space-y-4 rounded-xl border border-sky-500/30 bg-sky-950/10 p-6">
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
          required
          defaultValue={event?.venue_id}
          className="h-11 rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white sm:col-span-2"
        >
          <option value="">Select venue</option>
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
          defaultValue={event?.genre ?? "mixed"}
          className="h-11 rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white"
        >
          {["house", "techno", "afro", "hip-hop", "r&b", "latin", "live", "mixed"].map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <Input name="capacity" type="number" placeholder="Capacity" defaultValue={event?.capacity ?? ""} />
        <Input name="dj_lineup" placeholder="DJ lineup (comma-separated)" defaultValue={lineup} className="sm:col-span-2" />
        <Input name="ticket_from_eur" type="number" step="0.01" placeholder="From price (EUR)" defaultValue={event?.ticket_from_eur ?? ""} />
        <ImageUploadField name="image_url" label="Poster / cover" defaultUrl={event?.image_url ?? ""} folder="events" />
        <textarea
          name="description"
          placeholder="Description"
          defaultValue={event?.description ?? ""}
          rows={2}
          className="sm:col-span-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
        />
      </div>
      <div className="flex flex-wrap gap-4 text-sm text-white/80">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="is_featured" defaultChecked={event?.is_featured} /> Featured
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="is_listed_public" defaultChecked={event?.is_listed_public !== false} /> Published
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="is_hidden_premium" defaultChecked={event?.is_hidden_premium} /> Premium-only
        </label>
      </div>
      <Button type="submit">Save event</Button>
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
      <Input name="quantity_total" type="number" placeholder="Quantity" />
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
      <Button type="submit" className="sm:col-span-2">
        Add guestlist
      </Button>
    </form>
  );
}
