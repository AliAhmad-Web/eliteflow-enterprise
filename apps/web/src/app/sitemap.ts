import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site.config";
import { isSeoSitemapEnabled } from "@/features/seo/feature-flags";
import { SEO_PUBLIC_INDEXABLE_PATHS } from "@/features/seo/public-routes";

/**
 * When SEO_SITEMAP is OFF → empty sitemap (no public URL advertisement).
 * When ON → Class A public paths only.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  if (!isSeoSitemapEnabled()) {
    return [];
  }

  const lastModified = new Date();

  return SEO_PUBLIC_INDEXABLE_PATHS.map((path, index) => ({
    url: `${siteConfig.url}${path}`,
    lastModified,
    changeFrequency: "weekly" as const,
    priority: index === 0 ? 1 : 0.8,
  }));
}
