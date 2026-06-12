"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Clock, MapPin, Star } from "lucide-react";
import type { Guide } from "@/types/guides";
import { Badge } from "@/components/ui/badge";
import { formatDuration, formatPrice } from "@/lib/guides/constants";
import { cn } from "@/lib/utils";

interface GuideCardProps {
  guide: Guide;
  className?: string;
}

export function GuideCard({ guide, className }: GuideCardProps) {
  const locationLabel =
    guide.location_type === "city" || guide.location_type === "region"
      ? guide.location_name ?? guide.location_type
      : guide.location_type.charAt(0).toUpperCase() + guide.location_type.slice(1);

  return (
    <motion.article
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950/60 shadow-[0_20px_60px_rgba(0,0,0,0.45)]",
        className,
      )}
    >
      <Link href={`/guides/${guide.slug}`} className="absolute inset-0 z-10" prefetch>
        <span className="sr-only">{guide.title}</span>
      </Link>
      <div className="relative aspect-[16/10] w-full overflow-hidden">
        <Image
          src={guide.cover_image}
          alt=""
          fill
          className="object-cover transition duration-700 group-hover:scale-105"
          sizes="(max-width:768px) 100vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {guide.featured ? (
            <Badge variant="neon" className="backdrop-blur-md">
              <Star className="mr-1 h-3 w-3" />
              Featured
            </Badge>
          ) : null}
          <Badge variant="secondary" className="backdrop-blur-md capitalize">
            {guide.difficulty}
          </Badge>
        </div>
        <div className="absolute bottom-3 right-3">
          <span className="rounded-full bg-black/70 px-3 py-1 text-sm font-bold text-white backdrop-blur-md">
            {formatPrice(guide.price, guide.currency)}
          </span>
        </div>
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-center gap-2 text-xs text-white/45">
          <MapPin className="h-3.5 w-3.5 text-sky-400" />
          <span className="capitalize">{locationLabel}</span>
          <span>·</span>
          <Clock className="h-3.5 w-3.5" />
          <span>{formatDuration(guide)}</span>
        </div>
        <h3 className="text-lg font-semibold leading-tight text-white">{guide.title}</h3>
        {guide.description ? (
          <p className="line-clamp-2 text-sm text-white/55">{guide.description}</p>
        ) : null}
        {guide.categories.length ? (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {guide.categories.slice(0, 3).map((c) => (
              <Badge key={c} variant="secondary" className="text-[10px] capitalize">
                {c.replace(/_/g, " ")}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
    </motion.article>
  );
}
