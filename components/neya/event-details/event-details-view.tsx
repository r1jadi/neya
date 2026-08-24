import type { ComponentType } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  CalendarClock,
  CheckCircle2,
  Disc3,
  ExternalLink,
  MapPin,
  Ticket,
  Users,
} from "lucide-react";
import { AtmosphereMeter } from "@/components/neya/atmosphere-meter";
import { CrowdIndicator } from "@/components/neya/crowd-indicator";
import { LiveAtmospherePanel } from "@/components/neya/live-atmosphere-panel";
import { EventBadges } from "@/components/neya/event-details/event-badges";
import { GuestlistStatusBanner } from "@/components/neya/guestlist-status-banner";
import {
  EventDetailsCtas,
  type EventDetailsFlash,
} from "@/components/neya/event-details/event-details-ctas";
import { CollapsibleText } from "@/components/neya/collapsible-text";
import { EventStatusChip } from "@/components/neya/event-status-chip";
import { SaveEventButton } from "@/components/neya/save-event-button";
import { ShareButton } from "@/components/neya/share-button";
import { MyNightButton } from "@/components/my-night/my-night-button";
import { EventCard } from "@/components/neya/event-card";
import { PLACEHOLDER_IMAGE } from "@/lib/images";
import { formatEventWhen, isHappeningNow, isPast, isTonight } from "@/lib/event-dates";
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
import type { EventPulse } from "@/services/pulse";
import type { EventSocialCounts } from "@/services/social";
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
  /** Real pulse aggregates for the Live Pulse panel. */
  pulse?: EventPulse | null;
  /** Same-genre / same-venue / nearby upcoming events ("You might also like"). */
  relatedEvents?: Event[];
  /** Upcoming events at the same venue, used to surface "Next up". */
  venueEvents?: Event[];
  /** Real social-proof counts (saved bookmarks + paid tickets). */
  social?: EventSocialCounts;
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
          Your pulse is live 🔥
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

export function EventDetailsView({
  event,
  meta,
  artists = [],
  sources = [],
  saved,
  showSave,
  purchasedTickets,
  flash,
  pulse,
  relatedEvents = [],
  venueEvents = [],
  social,
}: EventDetailsViewProps) {
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

  // Live-pulse / crowd signals must reflect the actual event state — a night
  // that ended weeks ago is not "live" and shouldn't invite a pulse drop.
  const eventEnded = isPast(event.starts_at, event.ends_at);
  const eventLive = isHappeningNow(event.starts_at, event.ends_at);

  // "Next up" at the same venue — tonight first, otherwise the next listed night.
  const nextHere = venueEvents.filter((item) => item.id !== event.id).slice(0, 3);
  const nextHereTonight = nextHere.find((item) => isTonight(item.starts_at));
  const nextPick = nextHereTonight ?? nextHere[0];

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
          <p className="mx-auto mt-2 flex max-w-6xl flex-wrap items-center gap-x-2 text-base text-white/75">
            {event.venue ? (
              <Link href={`/venues/${event.venue.slug}`} className="font-medium hover:text-white hover:underline">
                {event.venue.name}
              </Link>
            ) : (
              <span className="font-medium">Venue TBA</span>
            )}
            <span className="text-white/30">·</span>
            <span className="text-sky-300/90">{whenShort}</span>
            <EventStatusChip
              startsAt={event.starts_at}
              endsAt={event.ends_at}
              liveStatus={event.live_status}
              className="ml-1"
            />
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        {/* Light, thumb-friendly actions — Save, My Night, Share for everyone (the sidebar is desktop-only). */}
        <div className="flex flex-wrap items-center gap-2">
          {showSave && isUuid(event.id) ? (
            <SaveEventButton eventId={event.id} eventSlug={event.slug} initialSaved={Boolean(saved)} className="flex-1 sm:flex-none" />
          ) : null}
          {isUuid(event.id) ? (
            <MyNightButton
              variant="default"
              className="flex-1 sm:flex-none"
              stop={{
                stopId: "",
                kind: "event",
                refId: event.id,
                title: event.title,
                subtitle: event.venue?.name ?? "Venue TBA",
                time: event.starts_at,
                endsAt: event.ends_at ?? null,
                image: event.image_url,
                slug: event.slug,
                lat: event.venue?.lat ?? null,
                lng: event.venue?.lng ?? null,
                available: true,
              }}
            />
          ) : null}
          <ShareButton
            title={event.title}
            text={`${event.title}${event.venue ? ` at ${event.venue.name}` : ""} — ${whenShort} on NEYA`}
            variant="solid"
            className="flex-1 sm:flex-none"
            kind="event"
          />
          {social && (social.saved > 0 || social.going > 0) ? (
            <div className="flex w-full flex-wrap items-center gap-2 pt-1 sm:w-auto sm:pt-0">
              {social.going > 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-white/70">
                  👥 {social.going} going
                </span>
              ) : null}
              {social.saved > 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-white/70">
                  🔥 {social.saved} saved
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                <CollapsibleText text={description} className="mt-3 text-base leading-relaxed text-white/75" />
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
                        <Image src={artist.profile_image} alt={artist.name} width={48} height={48} className="h-12 w-12 rounded-xl object-cover" />
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
                        {performer.image_url ? <Image src={performer.image_url} alt={performer.name} width={48} height={48} className="h-12 w-12 rounded-xl object-cover" /> : null}
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
              {event.venue ? (
                <div className="mt-3 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]">
                  <div className="flex flex-col sm:flex-row">
                    {eventHasPoster(event) && event.venue.image_url ? (
                      <div className="relative h-40 w-full shrink-0 sm:h-auto sm:w-48">
                        <Image
                          src={event.venue.image_url}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="(max-width:640px) 100vw, 192px"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent sm:bg-gradient-to-r" />
                      </div>
                    ) : null}
                    <div className="min-w-0 flex-1 p-5">
                      <div className="flex items-start gap-3">
                        <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-sky-300" />
                        <div className="min-w-0">
                          <Link href={`/venues/${event.venue.slug}`} className="font-medium text-white hover:underline">
                            {event.venue.name}
                          </Link>
                          <p className="mt-1 text-sm text-white/55">{locationLabel ?? "Prishtina"}</p>
                          <p className="mt-1 text-xs capitalize text-white/40">{event.venue.category.replace(/_/g, " ")}</p>
                        </div>
                      </div>
                      {nextPick ? (
                        <Link
                          href={`/events/${nextPick.slug}`}
                          className="mt-4 flex items-start gap-2 rounded-xl border border-sky-400/20 bg-sky-500/10 px-3 py-2.5 transition hover:border-sky-400/45 hover:bg-sky-500/15"
                        >
                          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
                          <span className="min-w-0">
                            <span className="block text-[10px] font-bold uppercase tracking-widest text-sky-300/90">
                              {isTonight(nextPick.starts_at) ? `Tonight at ${event.venue.name}` : "Next up at this venue"}
                            </span>
                            <span className="mt-0.5 line-clamp-1 text-sm font-medium text-white/90">
                              {nextPick.title} · {formatEventWhen(nextPick.starts_at)}
                            </span>
                          </span>
                          <ArrowRight className="ml-auto mt-1 h-4 w-4 shrink-0 text-sky-300/70 transition group-hover:translate-x-0.5" />
                        </Link>
                      ) : null}
                      <Link
                        href={`/venues/${event.venue.slug}`}
                        className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-sky-300 hover:text-sky-200 hover:underline"
                      >
                        Explore {event.venue.name}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex items-start gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-sky-300" />
                  <div>
                    <p className="font-medium text-white">Venue to be announced</p>
                    <p className="mt-1 text-sm text-white/55">Prishtina — follow the event for the address drop.</p>
                  </div>
                </div>
              )}
            </section>

            <section className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-white/45">Live pulse</h2>
              <CrowdIndicator count={event.crowd_count} live={eventLive} scheduledLabel={eventEnded ? "Ended" : "Starts soon"} />
              {isUuid(event.id) && event.venue ? (
                <LiveAtmospherePanel
                  eventId={event.id}
                  venueId={event.venue.id}
                  eventSlug={event.slug}
                  initialScore={event.atmosphere_rating}
                  pulse={pulse}
                  crowdCount={event.crowd_count}
                  ended={eventEnded}
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

        {relatedEvents.length ? (
          <section className="mt-14">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-white sm:text-2xl">
                  You might also like
                </h2>
                <p className="mt-1 text-sm text-white/50">More of this city, this week.</p>
              </div>
              <Link
                href="/events"
                className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-sky-300 transition hover:text-sky-200"
              >
                View all
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
            <div className="mt-5 grid grid-flow-col auto-cols-[82%] gap-4 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:auto-cols-[minmax(0,1fr)] sm:grid-flow-row sm:grid-cols-2 sm:px-0 lg:grid-cols-3">
              {relatedEvents.map((related) => (
                <EventCard key={related.id} event={related} />
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <EventDetailsCtas event={event} meta={meta} layout="sticky" />
    </>
  );
}