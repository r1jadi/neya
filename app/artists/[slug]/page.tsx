import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, CalendarDays, Disc3, ExternalLink, Globe, MapPin } from "lucide-react";
import { FollowArtistButton } from "@/components/neya/follow-artist-button";
import { EmptyState } from "@/components/neya/empty-state";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Badge } from "@/components/ui/badge";
import { SITE } from "@/lib/constants";
import { formatEventWhen } from "@/lib/event-dates";
import { PLACEHOLDER_IMAGE } from "@/lib/images";
import { createClient } from "@/lib/supabase/server";
import { getArtistBySlug, getFollowedArtistIds } from "@/services/artists";

type Props = {
  params: Promise<{ slug: string }>;
};

function safeExternalUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const artist = await getArtistBySlug(slug);
  if (!artist) return { title: "Artist not found" };
  const description =
    artist.short_bio ??
    artist.bio?.slice(0, 160) ??
    `${artist.name} — ${artist.genres.join(", ") || "DJ & artist"} in Prishtina.`;
  return {
    title: `${artist.name} · ${SITE.name}`,
    description,
    openGraph: {
      title: `${artist.name} · ${SITE.name}`,
      description,
      images: [artist.profile_image ?? artist.cover_image ?? PLACEHOLDER_IMAGE].filter(Boolean),
    },
  };
}

export default async function ArtistProfilePage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [artist, followedIds] = await Promise.all([
    getArtistBySlug(slug),
    user ? getFollowedArtistIds(user.id) : Promise.resolve<string[]>([]),
  ]);
  if (!artist) notFound();

  const cover = artist.cover_image ?? artist.profile_image;
  const following = followedIds.includes(artist.id);
  const instagram = safeExternalUrl(artist.instagram_url);
  const spotify = safeExternalUrl(artist.spotify_url);
  const soundcloud = safeExternalUrl(artist.soundcloud_url);
  const website = safeExternalUrl(artist.website_url);
  const socialLinks = [
    instagram ? { label: "Instagram", url: instagram } : null,
    spotify ? { label: "Spotify", url: spotify } : null,
    soundcloud ? { label: "SoundCloud", url: soundcloud } : null,
    website ? { label: "Website", url: website } : null,
  ].filter((entry): entry is { label: string; url: string } => entry !== null);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <SiteHeader />
      <main className="flex-1">
        <div className="relative aspect-[21/9] w-full max-h-[360px] overflow-hidden">
          {cover ? (
            <Image src={cover} alt="" fill className="object-cover" priority sizes="100vw" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-violet-700/40 via-fuchsia-700/25 to-sky-700/40" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        </div>

        <div className="mx-auto max-w-4xl px-4 pb-16 sm:px-6">
          <div className="-mt-16 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              {artist.profile_image ? (
                <Image
                  src={artist.profile_image}
                  alt={artist.name}
                  width={128}
                  height={128}
                  className="h-28 w-28 rounded-2xl border-4 border-black object-cover shadow-2xl sm:h-32 sm:w-32"
                />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-2xl border-4 border-black bg-gradient-to-br from-violet-600/40 to-fuchsia-600/40 shadow-2xl sm:h-32 sm:w-32">
                  <Disc3 className="h-10 w-10 text-white/50" />
                </div>
              )}
              <div className="pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-white">
                    {artist.name}
                  </h1>
                  {artist.is_verified ? (
                    <Badge variant="secondary" className="border-sky-400/30 text-sky-200">
                      <BadgeCheck className="mr-1 h-3 w-3" />
                      Verified
                    </Badge>
                  ) : null}
                </div>
                {artist.genres.length ? (
                  <p className="mt-1 text-sm text-white/55">{artist.genres.join(" · ")}</p>
                ) : null}
                {artist.follower_count != null ? (
                  <p className="mt-1 text-xs text-white/40">
                    {artist.follower_count} follower{artist.follower_count === 1 ? "" : "s"}
                  </p>
                ) : null}
              </div>
            </div>
            <FollowArtistButton
              artistId={artist.id}
              artistSlug={artist.slug}
              initialFollowing={following}
              className="self-start sm:self-auto"
            />
          </div>

          <div className="mt-8 space-y-10">
            {artist.bio || artist.short_bio ? (
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-widest text-white/45">About</h2>
                <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-white/75">
                  {artist.bio ?? artist.short_bio}
                </p>
              </section>
            ) : null}

            <section>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-white/45">
                Upcoming gigs
              </h2>
              {artist.upcoming_gigs?.length ? (
                <ul className="mt-4 space-y-3">
                  {artist.upcoming_gigs.map((gig) => (
                    <li
                      key={gig.id}
                      className="flex gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3 transition hover:border-white/20"
                    >
                      {gig.image_url ? (
                        <Image
                          src={gig.image_url}
                          alt=""
                          width={72}
                          height={72}
                          className="h-16 w-16 shrink-0 rounded-xl object-cover sm:h-20 sm:w-20"
                        />
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/events/${gig.slug}`}
                          className="font-semibold text-white hover:underline"
                        >
                          {gig.title}
                        </Link>
                        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/55">
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="h-3.5 w-3.5 text-sky-300" />
                            {formatEventWhen(gig.starts_at)}
                          </span>
                          {gig.venue ? (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 text-sky-300" />
                              {gig.venue.name}
                            </span>
                          ) : null}
                        </p>
                      </div>
                      <Link
                        href={`/events/${gig.slug}`}
                        className="self-center text-xs font-medium text-sky-300 hover:underline"
                      >
                        Event →
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  title="No upcoming gigs yet"
                  description={`${artist.name} hasn't announced the next night yet — follow to hear when they play.`}
                  icon={<CalendarDays className="h-8 w-8" />}
                  className="mt-4"
                />
              )}
            </section>

            {socialLinks.length ? (
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-widest text-white/45">
                  Music & social
                </h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {socialLinks.map((link) => (
                    <a
                      key={link.label}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/80 transition hover:border-sky-400/40 hover:text-white"
                    >
                      {link.label === "Website" ? (
                        <Globe className="h-4 w-4 text-sky-300" />
                      ) : (
                        <ExternalLink className="h-4 w-4 text-sky-300" />
                      )}
                      {link.label}
                    </a>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <p className="mt-12 text-center">
            <Link href="/artists" className="text-sm text-sky-300 hover:underline">
              All artists
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
