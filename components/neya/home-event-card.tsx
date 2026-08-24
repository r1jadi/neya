"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CalendarDays, MapPin, Sparkles, Ticket, Users } from "lucide-react";
import type { Event } from "@/types";
import { LiveBadge } from "@/components/neya/live-badge";
import { SaveEventButton } from "@/components/neya/save-event-button";
import { MyNightButton } from "@/components/my-night/my-night-button";
import { formatEventWhen, isHappeningNow } from "@/lib/event-dates";
import { categoryLabel } from "@/lib/discovery";
import { cn, isUuid } from "@/lib/utils";

interface HomeEventCardProps {
  event: Event;
  className?: string;
  saved?: boolean;
  /** Bigger poster-first layout used in the primary feed rows. */
  variant?: "hero" | "compact";
  style?: React.CSSProperties;
}

export function HomeEventCard({ event, className, saved, variant = "hero", style }: HomeEventCardProps) {
  const happening = isHappeningNow(event.starts_at, event.ends_at);
  const whenLabel = formatEventWhen(event.starts_at);
  const hasLive = happening && (event.live_status || event.crowd_count > 0);
  const hasTickets = Boolean(
    event.ticket_status === "available" || (event.ticket_from_eur != null && event.ticket_from_eur > 0) || event.ticket_url,
  );
  const price =
    event.is_free ? "Free"
    : event.ticket_from_eur != null ? `€${event.ticket_from_eur.toLocaleString("en-GB", { maximumFractionDigits: 2 })}`
    : null;

  return (
    <motion.article
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950/60 shadow-[0_20px_60px_rgba(0,0,0,0.45)]",
        className,
      )}
      style={style}
    >
      <Link href={`/events/${event.slug}`} className="absolute inset-0 z-10" prefetch>
        <span className="sr-only">{event.title}</span>
      </Link>
      <div className={cn("relative w-full shrink-0 overflow-hidden", variant === "hero" ? "aspect-[4/3]" : "aspect-[16/10]")}>
        <Image
          src={event.image_url}
          alt=""
          fill
          className="object-cover transition duration-700 group-hover:scale-105"
          sizes="(max-width:768px) 92vw, (max-width:1200px) 45vw, 33vw"
          loading={variant === "hero" ? "eager" : "lazy"}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <LiveBadge live={hasLive} />
          {event.category ? (
            <span className="rounded-full border border-white/15 bg-black/60 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/85 backdrop-blur-md">
              {categoryLabel(event.category)}
            </span>
          ) : null}
        </div>
        <div className="absolute right-3 top-3 z-20 flex items-center gap-2">
          {isUuid(event.id) ? (
            <>
              <MyNightButton
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
              <SaveEventButton eventId={event.id} eventSlug={event.slug} initialSaved={Boolean(saved)} className="h-9 gap-1 px-2.5 text-xs" />
            </>
          ) : null}
        </div>
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
              <CalendarDays className="h-3.5 w-3.5 text-sky-300" />
              {whenLabel}
            </span>
            {hasLive ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-200 backdrop-blur-md">
                <Users className="h-3.5 w-3.5" />
                {event.crowd_count} here
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
        {event.venue ? (
          <div className="flex items-center gap-2">
            {event.venue.image_url ? (
              <Image
                src={event.venue.image_url}
                alt=""
                width={28}
                height={28}
                className="h-7 w-7 shrink-0 rounded-full border border-white/10 object-cover"
              />
            ) : null}
            <p className="min-w-0 truncate text-xs font-semibold uppercase tracking-widest text-white/50">
              {event.venue.name}
              {event.venue.address ? (
                <span className="ml-1.5 hidden font-medium normal-case tracking-normal text-white/35 sm:inline">· {event.venue.address}</span>
              ) : null}
            </p>
          </div>
        ) : null}
        <h3 className="line-clamp-2 font-[family-name:var(--font-display)] text-lg font-bold leading-snug text-white">
          {event.title}
        </h3>

        {(event.genre !== "other" || event.fomo_line || event.atmosphere_rating > 0) ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-white/55">
            {event.genre !== "other" ? (
              <span className="inline-flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-fuchsia-300/80" />
                {event.genre.replace(/_/g, " ")}
              </span>
            ) : null}
            {event.atmosphere_rating > 0 ? (
              <span className="inline-flex items-center gap-1 font-semibold text-sky-300/90">
                <span aria-hidden>⭐</span> Vibe {event.atmosphere_rating.toFixed(1)}
              </span>
            ) : null}
            {event.reservation_spots_left != null && event.reservation_spots_left <= 4 ? (
              <span className="text-amber-200/90">{event.reservation_spots_left} tables left</span>
            ) : null}
            {event.fomo_line ? <span className="text-fuchsia-300/80">{event.fomo_line}</span> : null}
          </div>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-white/[0.07] pt-3">
          <div className="min-w-0">
            {event.distance_km != null ? (
              <p className="inline-flex items-center gap-1 text-xs text-white/45">
                <MapPin className="h-3.5 w-3.5 text-sky-300" /> {event.distance_km} km
              </p>
            ) : null}
            <p className="truncate text-sm font-bold text-white">
              {price ?? (event.ticket_status === "sold_out" ? "Sold out" : "Free entry")}
            </p>
          </div>
          {hasTickets && event.ticket_status !== "sold_out" ? (
            <span className="relative z-20 inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-sky-400 to-fuchsia-500 px-4 py-2 text-xs font-bold text-zinc-950 shadow-[0_0_20px_rgba(56,189,248,0.35)] transition group-hover:shadow-[0_0_28px_rgba(244,114,182,0.5)]">
              <Ticket className="h-3.5 w-3.5" />
              {event.ticket_url ? "Get tickets" : "View tickets"}
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          ) : (
            <span className="relative z-20 inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/70 transition group-hover:border-white/25 group-hover:text-white">
              View night
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          )}
        </div>
      </div>
    </motion.article>
  );
}