"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import type { Event } from "@/types";
import { EventCard } from "@/components/neya/event-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TrendingCarouselProps {
  title: string;
  subtitle?: string;
  events: Event[];
  className?: string;
  savedEventIds?: string[];
  /** Optional “View all →” target on desktop when a matching page exists. */
  viewAllHref?: string;
  viewAllLabel?: string;
}

export function TrendingCarousel({ title, subtitle, events, className, savedEventIds, viewAllHref, viewAllLabel }: TrendingCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!events.length) return null;
  const scrollBy = (dir: -1 | 1) => {
    scrollRef.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  return (
    <section className={cn("min-w-0 max-w-full space-y-4", className)}>
      <div className="flex items-end justify-between gap-4 px-1">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-white md:text-3xl">
            {title}
          </h2>
          {subtitle ? <p className="mt-1 text-sm text-white/55">{subtitle}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          {viewAllHref ? (
            <Link
              href={viewAllHref}
              className="hidden items-center gap-1 text-sm font-semibold text-sky-300 transition hover:text-sky-200 sm:inline-flex"
            >
              {viewAllLabel ?? "View all"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : null}
          <div className="hidden gap-2 sm:flex">
            <Button type="button" variant="secondary" size="icon" onClick={() => scrollBy(-1)} aria-label="Previous">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button type="button" variant="secondary" size="icon" onClick={() => scrollBy(1)} aria-label="Next">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="flex min-w-0 max-w-full snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {events.map((event, i) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06, duration: 0.4 }}
            className="w-[min(100%,320px)] shrink-0 snap-start"
          >
            <EventCard event={event} saved={savedEventIds?.includes(event.id)} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
