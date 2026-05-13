import type { MetadataRoute } from "next";
import { SITE } from "@/lib/constants";

export default function robots(): MetadataRoute.Robots {
  const host = (() => {
    try {
      return new URL(SITE.url).host;
    } catch {
      return "localhost:3000";
    }
  })();
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE.url.replace(/\/$/, "")}/sitemap.xml`,
    host,
  };
}
