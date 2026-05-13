import type { MetadataRoute } from "next";
import { SITE } from "@/lib/constants";
import { MOCK_EVENTS, MOCK_VENUES } from "@/data/mock-data";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE.url;
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/events`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/login`, changeFrequency: "monthly", priority: 0.3 },
  ];
  const events = MOCK_EVENTS.map((e) => ({
    url: `${base}/events/${e.slug}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));
  const venues = MOCK_VENUES.map((v) => ({
    url: `${base}/venues/${v.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.75,
  }));
  return [...staticRoutes, ...events, ...venues];
}
