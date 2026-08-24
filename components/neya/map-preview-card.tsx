"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin, Sparkles } from "lucide-react";
import { LiveBadge } from "@/components/neya/live-badge";
import { SaveEventButton } from "@/components/neya/save-event-button";
import { SaveVenueButton } from "@/components/neya/save-venue-button";
import { Badge } from "@/components/ui/badge";
import { formatEventTimeRange, formatGenreLabel } from "@/lib/event-display";
import type { Event, Venue } from "@/types";
import { cn, isUuid, neyaPrimaryGradient } from "@/lib/utils";

interface MapPreviewCardProps {
  kind: "event" | "venue";
  event?: Event | null;
  venue?: Venue | null;
  /** First upcoming event at this venue (for the “Tonight” chip). */
  venueTonight?: Event | null;
  distanceKm?: number;
  saved?: boolean;
  className?: string;
}

export function MapPreviewCard({
  kind,
  event,
  venue,
  venueTonight,
  distanceKm,
  saved,
  className,
}: MapPreviewCardProps) {
  if (kind === "event" && event) {
    const price =
      event.is_free ? "Free"
      : event.ticket_from_eur != null ? `From €${event.ticket_from_eur.toLocaleString("en-GB", { maximumFractionDigits: 2 })}`
      : null;
    return (
      <article className={`flex w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/95 shadow-[0_30px_80px_rgba(0,0,0,0.7)] ${className ?? ""}`}>
        <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden">
          <Image src={event.image_url} alt={event.title} fill className="object-cover" sizes="(max-width:768px) 100vw, 320px" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
          <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2">
            <LiveBadge live={event.live_status && event.crowd_count > 0} />
          </div>
          {event.crowd_count > 0 ? (
            <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-bold text-emerald-200 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              {event.crowd_count} here
            </div>
          ) : null}
          <div className="absolute bottom-3 left-3 right-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-fuchsia-300/90">
              {event.venue?.name ?? "Venue TBA"}
            </p>
            <h3 className="mt-1 line-clamp-2 font-[family-name:var(--font-display)] text-xl font-bold leading-tight text-white">
              {event.title}
            </h3>
          </div>
        </div>

        <div className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-white/65">
            <span className="inline-flex items-center gap-1 text-sky-300/90">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatEventTimeRangeShort(event)}
            </span>
            <span className="inline-flex items-center gap-1 capitalize">
              <Sparkles className="h-3.5 w-3.5 text-fuchsia-300/80" />
              {formatGenreLabel(event.genre)}
            </span>
            {event.atmosphere_rating > 0 ? (
              <span className="font-semibold text-sky-300/90">
                <span aria-hidden>⭐</span> Vibe {event.atmosphere_rating.toFixed(1)}
              </span>
            ) : null}
            {distanceKm != null ? (
              <span className="inline-flex items-center gap-1 text-white/45">
                <MapPin className="h-3.5 w-3.5" />
                {distanceLabel(distanceKm)}
              </span>
            ) : null}
          </div>

          {event.fomo_line ? (
            <p className="text-xs font-medium text-fuchsia-300/90">{event.fomo_line}</p>
          ) : null}

          <div className="flex items-center justify-between gap-3 border-t border-white/[0.07] pt-3">
            <p className="text-sm font-bold text-white">{price ?? (event.ticket_status === "sold_out" ? "Sold out" : "Entry")}</p>
            <div className="flex items-center gap-2">
              {isUuid(event.id) ? (
                <SaveEventButton eventId={event.id} eventSlug={event.slug} initialSaved={Boolean(saved)} />
              ) : null}
              <Link
                href={`/events/${event.slug}`}
                className={cn("inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition", neyaPrimaryGradient)}
>
                View event <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </article>
    );
  }

  if (kind === "venue" && venue) {
    const locationLabel = [venue.address, venue.city_slug === "prishtina" ? "Prishtina" : venue.city_slug.replace(/-/g, " ")]
      .filter(Boolean)
      .join(" · ");
    return (
      <article className={`flex w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/95 shadow-2xl ${className ?? ""}`}>
        <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden">
          <Image src={venue.image_url} alt={venue.name} fill className="object-cover" sizes="(max-width:768px) 100vw, 320px" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
          <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="backdrop-blur-md">
              {venue.category.replace(/_/g, " ")}
            </Badge>
            <LiveBadge live={venue.is_live} />
          </div>
          {venue.crowd_count != null && venue.crowd_count > 0 ? (
            <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-bold text-emerald-200 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              {venue.crowd_count} here
            </div>
          ) : null}
          <div className="absolute bottom-3 left-3 right-3">
            <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-white">{venue.name}</h3>
            {locationLabel ? (
              <p className="mt-0.5 text-xs capitalize text-white/65">
                {venue.category.replace(/_/g, " ")} · {locationLabel}
              </p>
            ) : null}
          </div>
        </div>

        <div className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-white/65">
            {venue.atmosphere_score != null && venue.atmosphere_score > 0 ? (
              <span className="font-semibold text-sky-300/90">
                <span aria-hidden>⭐</span> Vibe {venue.atmosphere_score.toFixed(1)}
              </span>
            ) : null}
            {"€".repeat(venue.price_level)}
            {distanceKm != null ? (
              <span className="inline-flex items-center gap-1 text-white/45">
                <MapPin className="h-3.5 w-3.5" />
                {distanceLabel(distanceKm)}
              </span>
            ) : null}
          </div>

          {venueTonight ? (
            <Link
              href={`/events/${venueTonight.slug}`}
              className="flex items-start gap-2 rounded-lg border border-sky-400/20 bg-sky-500/10 px-2.5 py-2 transition hover:border-sky-400/45 hover:bg-sky-500/15"
            >
              <CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-300" />
              <span className="min-w-0">
                <span className="block text-[10px] font-bold uppercase tracking-widest text-sky-300/90">Tonight</span>
                <span className="mt-0.5 line-clamp-1 text-xs font-medium text-white/95">
                  {venueTonight.title} · {formatEventWhenShort(venueTonight)}
                </span>
              </span>
            </Link>
          ) : null}

          <div className="flex items-center justify-end gap-2 border-t border-white/[0.07] pt-3">
            {isUuid(venue.id) ? (
              <SaveVenueButton venueId={venue.id} venueSlug={venue.slug} />
            ) : null}
            <Link
              href={`/venues/${venue.slug}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-bold text-black transition hover:bg-white/90"
            >
              Explore venue <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </article>
    );
  }

  return null;
}

function formatEventTimeRangeShort(event: Event): string {
  const when = formatEventTimeRange(event.starts_at, event.ends_at);
  // Keep it compact for the card: "Tonight · 23:00" / "Sat 18 Jul · 23:00"
  const [date, time] = when.split(" · ").slice(-2);
  if (!time) return when;
  const shortDate = date.split(",")[0] ?? date;
  return `${shortDate.trim()} · ${time.split(" – ")[0]}`;
}

function formatEventWhenShort(event: Event): string {
  const time = new Date(event.starts_at).toLocaleTimeString("en-GB", {
    timeZone: "Europe/Belgrade",
    hour: "2-digit",
    minute: "2-digit",
  });
  return time;
}

function distanceLabel(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}