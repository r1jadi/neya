"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { MapPin, Sparkles } from "lucide-react";
import type { Event } from "@/types";
import { AtmosphereMeter } from "@/components/neya/atmosphere-meter";
import { CrowdIndicator } from "@/components/neya/crowd-indicator";
import { LiveBadge } from "@/components/neya/live-badge";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface EventCardProps {
  event: Event;
  className?: string;
}

export function EventCard({ event, className }: EventCardProps) {
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
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <LiveBadge live={event.live_status} />
          <Badge variant="neon" className="backdrop-blur-md">
            <Sparkles className="mr-1 h-3 w-3" />
            {event.genre}
          </Badge>
        </div>
      </div>
      <div className="space-y-3 p-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-white/45">{event.venue.name}</p>
          <h3 className="mt-1 text-lg font-semibold leading-tight text-white">{event.title}</h3>
        </div>
        {event.fomo_line ? (
          <p className="text-xs font-medium text-fuchsia-300/90">{event.fomo_line}</p>
        ) : null}
        <CrowdIndicator count={event.crowd_count} />
        <AtmosphereMeter score={event.atmosphere_rating} />
        <div className="flex flex-wrap items-center gap-3 text-xs text-white/55">
          {event.distance_km != null ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-sky-300" />
              {event.distance_km} km
            </span>
          ) : null}
          <span>{"€".repeat(event.price_level)}</span>
          {event.reservation_spots_left != null ? (
            <span className="text-amber-200/90">
              {event.reservation_spots_left} tables left
            </span>
          ) : null}
        </div>
      </div>
    </motion.article>
  );
}
