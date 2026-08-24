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
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/my-night/"],
        disallow: [
          "/dashboard",
          "/business",
          "/admin",
          "/venue",
          "/checkout",
          "/onboarding",
          "/my-night$",
          "/api/",
          "/auth/",
          "/login",
          "/register",
          "/forgot-password",
          "/update-password",
        ],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host,
  };
}
