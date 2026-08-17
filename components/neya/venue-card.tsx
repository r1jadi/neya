"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { MapPin, Sparkles } from "lucide-react";
import { VENUE_CATEGORIES, type Venue } from "@/types";
import { LiveBadge } from "@/components/neya/live-badge";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface VenueCardProps {
  venue: Venue;
  /** Optional "This week" highlight title shown on the card. */
  highlightTitle?: string;
  className?: string;
}

const categoryLabel = (category: Venue["category"]) =>
  category === "club" ? "Club" : VENUE_CATEGORIES.find((item) => item.id === category)?.label ?? "Other";

export function VenueCard({ venue, highlightTitle, className }: VenueCardProps) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950/50",
        className,
      )}
    >
      <Link href={`/venues/${venue.slug}`} className="absolute inset-0 z-10" prefetch>
        <span className="sr-only">{venue.name}</span>
      </Link>
      <div className="relative aspect-[4/3] w-full">
        <Image src={venue.image_url} alt="" fill className="object-cover" sizes="(max-width:768px) 50vw, 25vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
        <div className="absolute left-3 top-3 flex gap-2">
          <Badge variant="secondary">{categoryLabel(venue.category)}</Badge>
          <LiveBadge live={venue.is_live} />
        </div>
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="text-base font-semibold text-white">{venue.name}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/60">
            {venue.atmosphere_score != null ? (
              <span className="text-sky-200/90">{venue.atmosphere_score.toFixed(1)} vibe</span>
            ) : null}
            {venue.crowd_count != null ? <span>{venue.crowd_count} here</span> : null}
            {venue.distance_km != null ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {venue.distance_km} km
              </span>
            ) : null}
            <span>{"€".repeat(venue.price_level)}</span>
          </div>
          {highlightTitle ? (
            <p className="mt-1.5 line-clamp-1 text-xs font-medium text-amber-200/90">
              <Sparkles className="mr-1 inline h-3 w-3" />
              This week: {highlightTitle}
            </p>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}
