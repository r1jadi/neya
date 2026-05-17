import type { MetadataRoute } from "next";
import { SITE } from "@/lib/constants";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE.url;
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/events`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/login`, changeFrequency: "monthly", priority: 0.3 },
  ];

  try {
    const admin = createAdminClient();
    const [{ data: events }, { data: venues }] = await Promise.all([
      admin.from("events").select("slug, updated_at").eq("is_listed_public", true).limit(500),
      admin.from("venues").select("slug, updated_at").eq("approved", true).eq("rejected", false).limit(500),
    ]);

    const eventRoutes =
      events?.map((e) => ({
        url: `${base}/events/${e.slug}`,
        lastModified: e.updated_at ? new Date(e.updated_at) : new Date(),
        changeFrequency: "daily" as const,
        priority: 0.8,
      })) ?? [];

    const venueRoutes =
      venues?.map((v) => ({
        url: `${base}/venues/${v.slug}`,
        lastModified: v.updated_at ? new Date(v.updated_at) : new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.75,
      })) ?? [];

    return [...staticRoutes, ...eventRoutes, ...venueRoutes];
  } catch {
    return staticRoutes;
  }
}
