"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { CalendarDays, MapPin, Sparkles, Ticket } from "lucide-react";
import type { Event } from "@/types";
import { LiveBadge } from "@/components/neya/live-badge";
import { SaveEventButton } from "@/components/neya/save-event-button";
import { MyNightButton } from "@/components/my-night/my-night-button";
import { Badge } from "@/components/ui/badge";
import { formatEventWhen, isHappeningNow } from "@/lib/event-dates";
import { cn, isUuid } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

interface EventCardProps {
  event: Event;
  className?: string;
  saved?: boolean;
}

export function EventCard({ event, className, saved }: EventCardProps) {
  const { t } = useI18n();
  const happening = isHappeningNow(event.starts_at, event.ends_at);
  const whenLabel = formatEventWhen(event.starts_at);

  return (
    <motion.article
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950/60 shadow-[0_20px_60px_rgba(0,0,0,0.45)]",
        className,
      )}
    >
      <Link href={`/events/${event.slug}`} className="absolute inset-0 z-10" prefetch>
        <span className="sr-only">{event.title}</span>
      </Link>
      <div className="relative aspect-[16/10] w-full overflow-hidden">
        <Image
          src={event.image_url}
          alt=""
          fill
          className="object-cover transition duration-700 group-hover:scale-105"
          sizes="(max-width:768px) 100vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
        <div className="absolute right-3 top-3 z-20 flex items-center gap-2">
          {isUuid(event.id) ? (
            <>
              <MyNightButton
                stop={{
                  stopId: "",
                  kind: "event",
                  refId: event.id,
                  title: event.title,
                  subtitle: event.venue?.name ?? t.eventCard.dancefloor,
                  time: event.starts_at,
                  endsAt: event.ends_at ?? null,
                  image: event.image_url,
                  slug: event.slug,
                  lat: event.venue?.lat ?? null,
                  lng: event.venue?.lng ?? null,
                  available: true,
                }}
              />
              <SaveEventButton eventId={event.id} eventSlug={event.slug} initialSaved={Boolean(saved)} />
            </>
          ) : null}
        </div>
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <LiveBadge live={happening && event.live_status} />
          {event.category ? (
            <Badge variant="secondary" className="backdrop-blur-md">
              {event.category.replace(/_/g, " ")}
            </Badge>
          ) : null}
          <Badge variant="neon" className="backdrop-blur-md">
            <Sparkles className="mr-1 h-3 w-3" />
            {event.genre}
          </Badge>
        </div>
      </div>
      <div className="space-y-3 p-4">
        <div>
          {event.venue ? <p className="text-xs uppercase tracking-widest text-white/45">{event.venue.name}{event.city_slug ? ` · ${event.city_slug.replace(/-/g, " ")}` : ""}</p> : event.city_slug ? <p className="text-xs uppercase tracking-widest text-white/45">{event.city_slug.replace(/-/g, " ")}</p> : null}
          <h3 className="mt-1 text-lg font-semibold leading-tight text-white">{event.title}</h3>
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-sky-300/90"><CalendarDays className="h-3.5 w-3.5" />{whenLabel}</p>
        </div>
        {event.fomo_line ? (
          <p className="text-xs font-medium text-fuchsia-300/90">{event.fomo_line}</p>
        ) : null}
        <div className="flex flex-wrap items-center gap-3 text-xs text-white/55">
          {event.distance_km != null ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-sky-300" />
              {event.distance_km} km
            </span>
          ) : null}
          {event.is_free ? <span className="font-medium text-emerald-200">{t.actions.free}</span> : null}
          {!event.is_free && event.ticket_from_eur != null ? <span>{t.eventCard.from} €{event.ticket_from_eur.toLocaleString("en-GB", { maximumFractionDigits: 2 })}</span> : null}
          {event.ticket_status ? <span className={event.ticket_status === "available" ? "inline-flex items-center gap-1 text-sky-200" : "inline-flex items-center gap-1 text-amber-200"}><Ticket className="h-3.5 w-3.5" />{event.ticket_status === "available" ? t.eventCard.ticketsAvailable : event.ticket_status === "sold_out" ? t.eventCard.soldOut : t.eventCard.salesClosed}</span> : null}
          {event.reservation_spots_left != null ? (
            <span className="text-amber-200/90">
              {event.reservation_spots_left} {t.eventCard.tablesLeft}
            </span>
          ) : null}
        </div>
      </div>
    </motion.article>
  );
}
