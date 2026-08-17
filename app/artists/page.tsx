import type { Metadata } from "next";
import { ArtistDirectory } from "@/components/neya/artist-directory";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SITE } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { getArtistsForDirectory, getFollowedArtistIds } from "@/services/artists";

export const metadata: Metadata = {
  title: `Artists · ${SITE.name}`,
  description: "Discover the DJs and artists shaping Prishtina nightlife — see where they're playing, follow your favorites, and find their music.",
};

export default async function ArtistsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [artists, followedIds] = await Promise.all([
    getArtistsForDirectory(),
    user ? getFollowedArtistIds(user.id) : Promise.resolve<string[]>([]),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <div className="max-w-2xl">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-white sm:text-4xl">
            Artists
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-white/55">
            The DJs and artists shaping Prishtina&apos;s nightlife — follow your favorites to keep
            up with where they&apos;re playing next.
          </p>
        </div>

        <div className="mt-8">
          <ArtistDirectory artists={artists} followedIds={followedIds} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
