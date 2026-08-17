import type { MetadataRoute } from "next";
import { SITE } from "@/lib/constants";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE.url;
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/events`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/cities/prishtina`, changeFrequency: "daily", priority: 0.85 },
    { url: `${base}/guides`, changeFrequency: "weekly", priority: 0.85 },
    { url: `${base}/login`, changeFrequency: "monthly", priority: 0.3 },
  ];

  try {
    const admin = createAdminClient();
    const [{ data: events }, { data: venues }, { data: guides }, { data: cities }] = await Promise.all([
      admin.from("events").select("slug, updated_at").eq("is_listed_public", true).limit(500),
      admin.from("venues").select("slug, updated_at").eq("approved", true).eq("rejected", false).limit(500),
      admin.from("guides").select("slug, updated_at").eq("published", true).limit(500),
      admin.from("cities").select("slug, country_slug, region_slug, updated_at").eq("is_active", true).limit(200),
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

    const guideRoutes =
      guides?.map((g) => ({
        url: `${base}/guides/${g.slug}`,
        lastModified: g.updated_at ? new Date(g.updated_at) : new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })) ?? [];

    const cityRoutes = cities?.map((city) => (
      { url: `${base}/cities/${city.slug}`, lastModified: city.updated_at ? new Date(city.updated_at) : new Date(), changeFrequency: "daily" as const, priority: 0.8 }
    )) ?? [];
    const countryRoutes = [...new Map((cities ?? []).map((city) => [city.country_slug, city])).values()].map((city) => ({ url: `${base}/countries/${city.country_slug}`, lastModified: city.updated_at ? new Date(city.updated_at) : new Date(), changeFrequency: "weekly" as const, priority: 0.65 }));
    const regionRoutes = [...new Map((cities ?? []).map((city) => [city.region_slug, city])).values()].map((city) => ({ url: `${base}/regions/${city.region_slug}`, lastModified: city.updated_at ? new Date(city.updated_at) : new Date(), changeFrequency: "weekly" as const, priority: 0.6 }));

    return [...staticRoutes, ...eventRoutes, ...venueRoutes, ...guideRoutes, ...cityRoutes, ...countryRoutes, ...regionRoutes];
  } catch {
    return staticRoutes;
  }
}
