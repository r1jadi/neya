import type { ComponentType } from "react";
import Image from "next/image";
import Link from "next/link";
import { Calendar, Disc3, MapPin, Ticket, Users } from "lucide-react";
import { AtmosphereMeter } from "@/components/neya/atmosphere-meter";
import { CrowdIndicator } from "@/components/neya/crowd-indicator";
import { LiveAtmospherePanel } from "@/components/neya/live-atmosphere-panel";
import { EventBadges } from "@/components/neya/event-details/event-badges";
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
import type { Event } from "@/types";
import { isUuid } from "@/lib/utils";

export type EventDetailsViewProps = {
  event: Event;
  meta: EventBookingMeta | null;
  saved?: boolean;
  showSave?: boolean;
  flash?: EventDetailsFlash;
};

function FlashMessages({ flash }: { flash?: EventDetailsFlash }) {
  if (!flash) return null;
  return (
    <>
      {flash.guestlist === "applied" ? (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
          Guestlist request sent.
        </p>
      ) : null}
      {flash.guestlist === "duplicate" ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          You&apos;re already on this list.
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

export function EventDetailsView({ event, meta, saved, showSave, flash }: EventDetailsViewProps) {
  const description = getEventDescription(event);
  const capacityLabel = formatCapacity(event.capacity);
  const ticketLabel = formatTicketPrice(event);
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
            <Link href={`/venues/${event.venue.slug}`} className="font-medium hover:text-white hover:underline">
              {event.venue.name}
            </Link>
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
                  No description yet — check back closer to the night or follow {event.venue.name} for updates.
                </div>
              )}
            </section>

            <section>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-white/45">Lineup</h2>
              {event.dj_lineup?.length ? (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {event.dj_lineup.map((dj) => (
                    <li
                      key={dj}
                      className="rounded-full border border-fuchsia-500/25 bg-fuchsia-500/10 px-4 py-2 text-sm font-medium text-fuchsia-100"
                    >
                      {dj}
                    </li>
                  ))}
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
                  <Link href={`/venues/${event.venue.slug}`} className="font-medium text-white hover:underline">
                    {event.venue.name}
                  </Link>
                  <p className="mt-1 text-sm text-white/55">{locationLabel ?? "Prishtina"}</p>
                  <p className="mt-1 text-xs capitalize text-white/40">{event.venue.category.replace(/_/g, " ")}</p>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-white/45">Live pulse</h2>
              <CrowdIndicator count={event.crowd_count} />
              {isUuid(event.id) ? (
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
              <EventDetailsCtas
                event={event}
                meta={meta}
                saved={saved}
                showSave={showSave}
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
