import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, CalendarDays, Disc3 } from "lucide-react";
import { FollowArtistButton } from "@/components/neya/follow-artist-button";
import { Badge } from "@/components/ui/badge";
import { formatEventWhen } from "@/lib/event-dates";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import type { Artist } from "@/types";

interface ArtistCardProps {
  artist: Artist;
  initialFollowing?: boolean;
  className?: string;
}

export function ArtistCard({ artist, initialFollowing = false, className }: ArtistCardProps) {
  const { t } = useI18n();
  const hasImage = Boolean(artist.profile_image);
  const genres = artist.genres.slice(0, 3);
  const gig = artist.next_gig;

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950/60 shadow-[0_20px_60px_rgba(0,0,0,0.45)] transition hover:border-white/20",
        className,
      )}
    >
      <Link href={`/artists/${artist.slug}`} className="absolute inset-0 z-10" prefetch>
        <span className="sr-only">{artist.name}</span>
      </Link>
      <div className="relative aspect-square w-full overflow-hidden">
        {hasImage ? (
          <Image
            src={artist.profile_image!}
            alt=""
            fill
            className="object-cover transition duration-700 group-hover:scale-105"
            sizes="(max-width:640px) 50vw, 25vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-600/30 via-fuchsia-600/20 to-sky-600/30">
            <Disc3 className="h-12 w-12 text-white/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
        <div className="absolute right-3 top-3 z-20">
          {artist.is_verified ? (
            <Badge variant="secondary" className="border-sky-400/30 bg-black/60 text-sky-200 backdrop-blur-md">
              <BadgeCheck className="mr-1 h-3 w-3" />
              {t.artistsPage.verified}
            </Badge>
          ) : null}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div>
          <h3 className="text-lg font-semibold leading-tight text-white">{artist.name}</h3>
          {genres.length ? (
            <p className="mt-1 text-xs text-white/55">{genres.join(" · ")}</p>
          ) : null}
        </div>
        {artist.short_bio ? (
          <p className="line-clamp-2 text-xs leading-relaxed text-white/45">{artist.short_bio}</p>
        ) : null}
        {gig ? (
          <p className="inline-flex items-center gap-1.5 text-xs font-medium text-fuchsia-300/90">
            <CalendarDays className="h-3.5 w-3.5" />
            {formatEventWhen(gig.starts_at)}
            {gig.venue_name ? <span className="text-white/45">· {gig.venue_name}</span> : null}
          </p>
        ) : (
          <p className="text-xs text-white/30">{t.artistsPage.noGigs}</p>
        )}
        <div className="relative z-20 mt-auto pt-2">
          <FollowArtistButton
            artistId={artist.id}
            artistSlug={artist.slug}
            initialFollowing={initialFollowing}
            compact
            className="w-full"
          />
        </div>
      </div>
    </article>
  );
}
