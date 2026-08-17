import type { ComponentType } from "react";
import Image from "next/image";
import Link from "next/link";
import { Calendar, CheckCircle2, Disc3, ExternalLink, MapPin, Ticket, Users } from "lucide-react";
import { AtmosphereMeter } from "@/components/neya/atmosphere-meter";
import { CrowdIndicator } from "@/components/neya/crowd-indicator";
import { LiveAtmospherePanel } from "@/components/neya/live-atmosphere-panel";
import { EventBadges } from "@/components/neya/event-details/event-badges";
import { GuestlistStatusBanner } from "@/components/neya/guestlist-status-banner";
import {
  EventDetailsCtas,
  type EventDetailsFlash,
} from "@/components/neya/event-details/event-details-ctas";
import { PLACEHOLDER_IMAGE } from "@/lib/images";
import {
  eventHasPoster,
  formatCapacity,
  formatEventTimeRange,
  formatGenreLabel,
  formatTicketPrice,
  getEventDescription,
  getEventWhenLabel,
  getVenueLocationLabel,
} from "@/lib/event-display";
import type { EventBookingMeta } from "@/services/booking-meta";
import type { EventSource } from "@/services/event-sources";
import type { ArtistLineupRef, Event } from "@/types";
import { isUuid } from "@/lib/utils";

export type EventDetailsViewProps = {
  event: Event;
  meta: EventBookingMeta | null;
  /** Artists linked via the directory (rendered as profile links). */
  artists?: ArtistLineupRef[];
  saved?: boolean;
  showSave?: boolean;
  purchasedTickets?: number;
  flash?: EventDetailsFlash;
  sources?: EventSource[];
};

function FlashMessages({ flash }: { flash?: EventDetailsFlash }) {
  if (!flash) return null;
  return (
    <>
      {flash.guestlist === "submitted" ? (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
          Guestlist request submitted — you&apos;ll be notified once approved.
        </p>
      ) : null}
      {flash.voted ? (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
          Thanks — your pulse is in the room.
        </p>
      ) : null}
      {flash.error === "vote" ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          Could not save your vote. Make sure you are logged in and try again.
        </p>
      ) : null}
      {flash.error === "payment" ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          We couldn&apos;t start the payment — please try again in a moment.
        </p>
      ) : null}
      {flash.error === "soldout" ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          That ticket just sold out — try another tier or check the door.
        </p>
      ) : null}
      {flash.error === "ticket" ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          We couldn&apos;t start the ticket purchase — please try again.
        </p>
      ) : null}
      {flash.error === "ticket-unavailable" ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          Ticket sales for this event haven&apos;t opened or have ended.
        </p>
      ) : null}
      {flash.error === "in-progress" ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          You already have a purchase in progress for this ticket — finish or cancel it before buying again.
        </p>
      ) : null}
      {flash.error === "reservation" ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          We couldn&apos;t create your reservation — please try again.
        </p>
      ) : null}
      {flash.error === "reservations-closed" ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          Reservations are closed for this event.
        </p>
      ) : null}
      {flash.error === "missing-venue" ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          Reservations aren&apos;t available for this event yet — no venue linked.
        </p>
      ) : null}
      {flash.error === "payment-method" ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          Choose a payment method and try again.
        </p>
      ) : null}
      {flash.reservation === "confirmed" ? (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
          Table reservation confirmed.
        </p>
      ) : null}
      {flash.reservation === "pending" ? (
        <p className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm text-sky-100">
          Reservation submitted — pay at the venue. The host will confirm your table.
        </p>
      ) : null}
    </>
  );
}

function MetaTile({
  icon: Icon,
  label,
  value,
  fallback,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string | null;
  fallback: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/40">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-2 text-sm font-medium text-white">{value ?? fallback}</p>
    </div>
  );
}

function safeExternalUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function EventDetailsView({ event, meta, artists = [], sources = [], saved, showSave, purchasedTickets, flash }: EventDetailsViewProps) {
  const description = getEventDescription(event);
  const capacityLabel = formatCapacity(event.capacity);
  const cheapestTicketCents =
    meta?.ticketTypes.length && meta.ticketTypes.some((t) => t.status === "available")
      ? Math.min(...meta.ticketTypes.filter((t) => t.status === "available").map((t) => t.priceCents))
      : null;
  const ticketLabel =
    cheapestTicketCents != null
      ? `From €${(cheapestTicketCents % 100 === 0 ? (cheapestTicketCents / 100).toFixed(0) : (cheapestTicketCents / 100).toFixed(2))}`
      : meta?.ticketTypes.length
        ? (meta.ticketSoldOut ? "Sold out" : formatTicketPrice(event) ?? "Tickets")
        : formatTicketPrice(event);
  const locationLabel = getVenueLocationLabel(event);
  const whenShort = getEventWhenLabel(event);
  const whenFull = formatEventTimeRange(event.starts_at, event.ends_at);
  const hasPoster = eventHasPoster(event);

  return (
    <>
      <div className="relative aspect-[21/9] w-full max-h-[440px] overflow-hidden">
        <Image
          src={hasPoster ? event.image_url : PLACEHOLDER_IMAGE}
          alt={event.title}
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/20" />
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10">
          <EventBadges event={event} className="mx-auto flex max-w-6xl flex-wrap items-center gap-2" />
          <h1 className="mx-auto mt-4 max-w-6xl font-[family-name:var(--font-display)] text-3xl font-bold leading-tight text-white sm:text-5xl">
            {event.title}
          </h1>
          <p className="mx-auto mt-2 max-w-6xl text-base text-white/75">
            {event.venue ? (
              <Link href={`/venues/${event.venue.slug}`} className="font-medium hover:text-white hover:underline">
                {event.venue.name}
              </Link>
            ) : (
              <span className="font-medium">Venue TBA</span>
            )}
            <span className="mx-2 text-white/30">·</span>
            <span className="text-sky-300/90">{whenShort}</span>
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetaTile icon={Calendar} label="Date & time" value={whenFull} fallback="Time TBA" />
          <MetaTile icon={Disc3} label="Genre" value={formatGenreLabel(event.genre)} fallback="Mixed" />
          <MetaTile icon={Users} label="Capacity" value={capacityLabel} fallback="Venue capacity TBA" />
          <MetaTile icon={Ticket} label="Tickets" value={ticketLabel} fallback="Free entry" />
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-8 pb-24 sm:pb-8">
            <FlashMessages flash={flash} />

            <section>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-white/45">About</h2>
              {description ? (
                <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-white/75">{description}</p>
              ) : (
                <div className="mt-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-sm text-white/45">
                  No description yet — check back closer to the night or follow {event.venue?.name ?? "the organizers"} for updates.
                </div>
              )}
            </section>

            {sources.length ? <section><h2 className="text-sm font-semibold uppercase tracking-widest text-white/45">Sources</h2><p className="mt-2 text-sm text-white/50">Links supplied for this event. A checked label means NEYA reviewed that source; other links are shown without a trust claim.</p><ul className="mt-3 space-y-2">{sources.map((source) => <li key={source.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"><a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-sky-300 hover:underline">{source.label ?? source.source_type.replace(/_/g, " ")}<ExternalLink className="h-3.5 w-3.5" /></a>{source.is_verified ? <span className="inline-flex items-center gap-1 text-xs text-emerald-200"><CheckCircle2 className="h-3.5 w-3.5" />Reviewed by NEYA</span> : <span className="text-xs text-white/40">Source link</span>}</li>)}</ul></section> : null}

            <section>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-white/45">Lineup</h2>
              {artists.length || event.performers?.length ? (
                <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                  {artists.map((artist) => (
                    <li key={`artist-${artist.id}`} className="flex items-center gap-3 rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/5 p-3">
                      {artist.profile_image ? (
                        <Image src={artist.profile_image} alt="" width={48} height={48} className="h-12 w-12 rounded-xl object-cover" />
                      ) : null}
                      <div className="min-w-0">
                        <Link href={`/artists/${artist.slug}`} className="font-medium text-fuchsia-100 hover:text-white hover:underline">
                          {artist.name}
                        </Link>
                        {artist.genres.length ? <p className="mt-0.5 text-xs text-white/50">{artist.genres.join(" · ")}</p> : null}
                      </div>
                    </li>
                  ))}
                  {event.performers?.map((performer) => {
                    const links = Object.entries(performer.social_links ?? {})
                      .map(([label, value]) => [label, safeExternalUrl(value)] as const)
                      .filter((entry): entry is [string, string] => entry[1] !== null);
                    return (
                      <li key={`${performer.name}-${performer.genre ?? ""}`} className="flex gap-3 rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/5 p-3">
                        {performer.image_url ? <Image src={performer.image_url} alt="" width={48} height={48} className="h-12 w-12 rounded-xl object-cover" /> : null}
                        <div className="min-w-0">
                          <p className="font-medium text-fuchsia-100">{performer.name}</p>
                          {performer.genre ? <p className="mt-0.5 text-xs text-white/50">{performer.genre}</p> : null}
                          {links.length ? <div className="mt-1 flex flex-wrap gap-2">{links.map(([label, url]) => <a key={label} href={url} target="_blank" rel="noopener noreferrer" className="text-xs capitalize text-sky-300 hover:underline">{label}</a>)}</div> : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="mt-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-sm text-white/45">
                  Lineup dropping soon — the room will surprise you.
                </div>
              )}
            </section>

            <section>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-white/45">Location</h2>
              <div className="mt-3 flex items-start gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-sky-300" />
                <div>
                  {event.venue ? (
                    <>
                      <Link href={`/venues/${event.venue.slug}`} className="font-medium text-white hover:underline">
                        {event.venue.name}
                      </Link>
                      <p className="mt-1 text-sm text-white/55">{locationLabel ?? "Prishtina"}</p>
                      <p className="mt-1 text-xs capitalize text-white/40">{event.venue.category.replace(/_/g, " ")}</p>
                    </>
                  ) : (
                    <p className="font-medium text-white">Venue to be announced</p>
                  )}
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-white/45">Live pulse</h2>
              <CrowdIndicator count={event.crowd_count} />
              {isUuid(event.id) && event.venue ? (
                <LiveAtmospherePanel
                  eventId={event.id}
                  venueId={event.venue.id}
                  eventSlug={event.slug}
                  initialScore={event.atmosphere_rating}
                />
              ) : (
                <AtmosphereMeter score={event.atmosphere_rating} />
              )}
              {event.fomo_line ? (
                <p className="rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/5 p-4 text-sm font-medium text-fuchsia-100">
                  {event.fomo_line}
                </p>
              ) : null}
              {event.reservation_spots_left != null ? (
                <p className="text-sm text-amber-200/90">
                  {event.reservation_spots_left} table{event.reservation_spots_left === 1 ? "" : "s"} left tonight
                </p>
              ) : null}
            </section>
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-3 rounded-2xl border border-white/[0.08] bg-zinc-950/80 p-4 backdrop-blur-xl">
              <p className="text-xs font-semibold uppercase tracking-widest text-white/40">Get in</p>
              {meta?.guestlist && meta.guestlistAvailability ? (
                <GuestlistStatusBanner guestlist={meta.guestlist} availability={meta.guestlistAvailability} />
              ) : null}
              <EventDetailsCtas
                event={event}
                meta={meta}
                saved={saved}
                showSave={showSave}
                purchasedTickets={purchasedTickets}
                layout="sidebar"
              />
            </div>
          </aside>
        </div>
      </div>

      <EventDetailsCtas event={event} meta={meta} layout="sticky" />
    </>
  );
}
