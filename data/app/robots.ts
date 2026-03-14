import { MetadataRoute } from "next";
import { getSafeSiteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const base = getSafeSiteUrl().replace(/\/$/, "");
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/ad2min3k/"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
