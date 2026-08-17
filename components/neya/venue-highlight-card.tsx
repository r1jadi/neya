import Image from "next/image";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VenueHighlight } from "@/types";

function weekLabel(ymd: string): string {
  return new Date(`${ymd}T12:00:00`).toLocaleDateString("en-GB", {
    month: "short",
    day: "numeric",
  });
}

export function VenueHighlightCard({
  highlight,
  className,
}: {
  highlight: VenueHighlight;
  className?: string;
}) {
  const image = highlight.image_url ?? highlight.venue?.image_url ?? null;

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950/60 shadow-[0_20px_60px_rgba(0,0,0,0.45)] transition hover:border-amber-400/30",
        className,
      )}
    >
      {highlight.venue ? (
        <Link href={`/venues/${highlight.venue.slug}`} className="absolute inset-0 z-10" prefetch>
          <span className="sr-only">{highlight.title}</span>
        </Link>
      ) : null}
      <div className="relative aspect-[16/9] w-full overflow-hidden">
        {image ? (
          <Image
            src={image}
            alt=""
            fill
            className="object-cover transition duration-700 group-hover:scale-105"
            sizes="(max-width:768px) 100vw, 33vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-600/20 via-zinc-900 to-fuchsia-600/20">
            <CalendarDays className="h-10 w-10 text-white/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
        <div className="absolute left-3 top-3">
          <span className="rounded-full border border-amber-400/30 bg-black/60 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-200 backdrop-blur-md">
            This week
          </span>
        </div>
        <div className="absolute bottom-3 left-3 right-3">
          <p className="text-xs font-medium text-white/70">{highlight.venue?.name}</p>
          <h3 className="mt-0.5 text-lg font-semibold leading-tight text-white">{highlight.title}</h3>
        </div>
      </div>
      <div className="space-y-3 p-4">
        <p className="line-clamp-2 text-sm leading-relaxed text-white/60">{highlight.content}</p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-white/40">Week of {weekLabel(highlight.week_start)}</span>
          {highlight.event ? (
            <Link
              href={`/events/${highlight.event.slug}`}
              className="relative z-20 inline-flex items-center gap-1 text-xs font-semibold text-sky-300 hover:text-sky-200 hover:underline"
            >
              View event
              <span aria-hidden>→</span>
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}
