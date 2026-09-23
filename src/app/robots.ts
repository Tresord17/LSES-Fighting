import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/auth/site-url";

// Les espaces personnels et les routes techniques ne sont pas à indexer
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/auth/", "/fr/mon-espace", "/en/mon-espace"],
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
