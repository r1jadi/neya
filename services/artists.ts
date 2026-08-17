import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Artist, ArtistGig, ArtistLineupRef } from "@/types";

type ArtistRow = {
  id: string;
  slug: string;
  name: string;
  bio?: string | null;
  short_bio?: string | null;
  profile_image?: string | null;
  cover_image?: string | null;
  genres?: string[] | null;
  instagram_url?: string | null;
  spotify_url?: string | null;
  soundcloud_url?: string | null;
  website_url?: string | null;
  is_verified?: boolean | null;
  is_featured?: boolean | null;
  is_active?: boolean | null;
};

type GigRow = {
  id: string;
  slug: string;
  title: string;
  starts_at: string;
  ends_at?: string | null;
  image_url?: string | null;
  genre?: string | null;
  venues?: { id: string; slug: string; name: string } | { id: string; slug: string; name: string }[] | null;
};

const ARTIST_SELECT =
  "id, slug, name, bio, short_bio, profile_image, cover_image, genres, instagram_url, spotify_url, soundcloud_url, website_url, is_verified, is_featured, is_active";

/** PostgREST embedded relations can come back as an object (to-one) or array (to-many). */
function oneOrArray<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function mapArtistRow(row: ArtistRow): Artist {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    bio: row.bio || null,
    short_bio: row.short_bio || null,
    profile_image: row.profile_image || null,
    cover_image: row.cover_image || null,
    genres: row.genres ?? [],
    instagram_url: row.instagram_url || null,
    spotify_url: row.spotify_url || null,
    soundcloud_url: row.soundcloud_url || null,
    website_url: row.website_url || null,
    is_verified: Boolean(row.is_verified),
    is_featured: Boolean(row.is_featured),
  };
}

function mapGigRow(row: GigRow): ArtistGig {
  const v = Array.isArray(row.venues) ? row.venues[0] : row.venues;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    starts_at: row.starts_at,
    ends_at: row.ends_at ?? null,
    image_url: row.image_url || null,
    genre: row.genre || null,
    venue: v ? { id: v.id, slug: v.slug, name: v.name } : null,
  };
}

/** Follower counts keyed by artist id (service role — counts are not RLS-readable). */
async function followerCounts(artistIds: string[]): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  if (!artistIds.length) return counts;
  const admin = createAdminClient();
  const { data } = await admin.from("artist_follows").select("artist_id").in("artist_id", artistIds);
  for (const row of data ?? []) {
    const id = (row as { artist_id: string }).artist_id;
    counts[id] = (counts[id] ?? 0) + 1;
  }
  return counts;
}

/** Upcoming gigs (listed, not finished) for a set of artists, earliest first. */
async function upcomingGigsFor(artistIds: string[]): Promise<Record<string, GigRow[]>> {
  const byArtist: Record<string, GigRow[]> = {};
  if (!artistIds.length) return byArtist;
  const supabase = await createClient();
  const { data } = await supabase
    .from("event_artists")
    .select("artist_id, events!inner(id, slug, title, starts_at, ends_at, image_url, genre, venues(id, slug, name))")
    .in("artist_id", artistIds)
    .gte("events.starts_at", new Date().toISOString())
    .eq("events.is_listed_public", true)
    .order("starts_at", { referencedTable: "events", ascending: true });
  for (const row of data ?? []) {
    const artistId = (row as { artist_id: string }).artist_id;
    const ev = (row as { events: GigRow | GigRow[] }).events;
    const gig = Array.isArray(ev) ? ev[0] : ev;
    if (!gig) continue;
    (byArtist[artistId] ??= []).push(mapGigRow(gig));
  }
  return byArtist;
}

/** Public directory listing: active artists with follower counts + next gig. */
export async function getArtistsForDirectory(): Promise<Artist[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("artists").select(ARTIST_SELECT).eq("is_active", true).order("is_featured", { ascending: false }).order("name", { ascending: true });
  if (error) return [];
  const rows = (data ?? []) as ArtistRow[];
  const ids = rows.map((r) => r.id);
  const [counts, gigs] = await Promise.all([followerCounts(ids), upcomingGigsFor(ids)]);
  return rows.map((row) => {
    const artist = mapArtistRow(row);
    artist.follower_count = counts[row.id] ?? 0;
    const next = gigs[row.id]?.[0];
    if (next) {
      const v = Array.isArray(next.venues) ? next.venues[0] : next.venues;
      artist.next_gig = {
        id: next.id,
        slug: next.slug,
        title: next.title,
        starts_at: next.starts_at,
        venue_name: v?.name ?? null,
      };
    } else {
      artist.next_gig = null;
    }
    return artist;
  });
}

/** Full artist profile with upcoming gigs + follower count. */
export async function getArtistBySlug(slug: string): Promise<Artist | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("artists").select(ARTIST_SELECT).eq("slug", slug).eq("is_active", true).maybeSingle();
  if (error || !data) return null;
  const row = data as ArtistRow;
  const artist = mapArtistRow(row);
  const [counts, gigs] = await Promise.all([followerCounts([row.id]), upcomingGigsFor([row.id])]);
  artist.follower_count = counts[row.id] ?? 0;
  artist.upcoming_gigs = (gigs[row.id] ?? []).map(mapGigRow);
  return artist;
}

/** Artist ids the user follows (own-rows RLS). */
export async function getFollowedArtistIds(userId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("artist_follows").select("artist_id").eq("user_id", userId);
  return (data ?? []).map((r) => (r as { artist_id: string }).artist_id);
}

/** Followed artists for the dashboard. */
export async function getFollowedArtists(userId: string): Promise<Artist[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("artist_follows")
    .select("artists!inner(id, slug, name, short_bio, profile_image, genres, is_verified)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  const rows = (data ?? [])
    .map((r) => oneOrArray((r as { artists?: ArtistRow | ArtistRow[] }).artists))
    .filter((a): a is ArtistRow => Boolean(a?.is_active));
  return rows.map((row) => mapArtistRow(row));
}

/** Artists linked to one event (for the event lineup). */
export async function getArtistsForEvent(eventId: string): Promise<ArtistLineupRef[]> {
  if (!eventId) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("event_artists")
    .select("artists!inner(id, slug, name, genres, profile_image, is_active)")
    .eq("event_id", eventId)
    .eq("artists.is_active", true);
  return (data ?? [])
    .map((r) => oneOrArray((r as { artists?: ArtistRow | ArtistRow[] }).artists))
    .filter((a): a is ArtistRow => Boolean(a))
    .map((a) => ({
      id: a.id,
      slug: a.slug,
      name: a.name,
      genres: a.genres ?? [],
      profile_image: a.profile_image || null,
    }));
}

/** Artists per event id (venue page grids). */
export async function getArtistsForEvents(eventIds: string[]): Promise<Record<string, ArtistLineupRef[]>> {
  const map: Record<string, ArtistLineupRef[]> = {};
  if (!eventIds.length) return map;
  const supabase = await createClient();
  const { data } = await supabase
    .from("event_artists")
    .select("event_id, artists!inner(id, slug, name, genres, profile_image, is_active)")
    .in("event_id", eventIds)
    .eq("artists.is_active", true);
  for (const row of data ?? []) {
    const r = row as { event_id: string; artists?: ArtistRow | ArtistRow[] };
    const artist = oneOrArray(r.artists);
    if (!artist?.is_active) continue;
    (map[r.event_id] ??= []).push({
      id: artist.id,
      slug: artist.slug,
      name: artist.name,
      genres: artist.genres ?? [],
      profile_image: artist.profile_image || null,
    });
  }
  return map;
}

/* ------------------------------------------------------------------ */
/* Admin                                                               */
/* ------------------------------------------------------------------ */

/** All artists including inactive, for the admin panel. */
export async function getAdminArtists(): Promise<Artist[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("artists").select(ARTIST_SELECT).order("created_at", { ascending: false });
  if (error) return [];
  return ((data ?? []) as ArtistRow[]).map((row) => {
    const artist = mapArtistRow(row);
    artist.is_active = Boolean(row.is_active);
    return artist;
  });
}

export async function getArtistById(id: string): Promise<Artist | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("artists").select(ARTIST_SELECT).eq("id", id).maybeSingle();
  if (!data) return null;
  return mapArtistRow(data as ArtistRow);
}

/** Artist ids linked to each event (admin event form lineup). */
export async function getEventArtistIds(eventIds: string[]): Promise<Record<string, string[]>> {
  const map: Record<string, string[]> = {};
  if (!eventIds.length) return map;
  const admin = createAdminClient();
  const { data } = await admin
    .from("event_artists")
    .select("event_id, artist_id")
    .in("event_id", eventIds);
  for (const row of data ?? []) {
    const r = row as { event_id: string; artist_id: string };
    (map[r.event_id] ??= []).push(r.artist_id);
  }
  return map;
}
