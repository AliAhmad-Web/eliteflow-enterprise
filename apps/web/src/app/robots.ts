import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site.config";
import {
  isSeoAiCrawlersEnabled,
  isSeoRobotsEnabled,
  isSeoSitemapEnabled,
} from "@/features/seo/feature-flags";
import {
  SEO_APP_DISALLOW_PATHS,
  SEO_AUTH_DISALLOW_PATHS,
} from "@/features/seo/public-routes";

/**
 * When SEO_ROBOTS is OFF → permissive allow-all (pre–Phase-2 status quo).
 * When ON → allow /downloads*, disallow auth + app surfaces; optional AI crawler rules.
 */
export default function robots(): MetadataRoute.Robots {
  if (!isSeoRobotsEnabled()) {
    return {
      rules: {
        userAgent: "*",
        allow: "/",
      },
    };
  }

  const disallow = [
    ...SEO_AUTH_DISALLOW_PATHS,
    ...SEO_APP_DISALLOW_PATHS,
  ];

  const rules: MetadataRoute.Robots["rules"] = [
    {
      userAgent: "*",
      allow: ["/downloads"],
      disallow: [...disallow],
    },
  ];

  if (isSeoAiCrawlersEnabled()) {
    const aiAgents = [
      "GPTBot",
      "ChatGPT-User",
      "Google-Extended",
      "anthropic-ai",
      "ClaudeBot",
      "PerplexityBot",
    ];
    for (const userAgent of aiAgents) {
      rules.push({
        userAgent,
        allow: ["/downloads"],
        disallow: [...disallow],
      });
    }
  }

  return {
    rules,
    sitemap: isSeoSitemapEnabled()
      ? `${siteConfig.url}/sitemap.xml`
      : undefined,
    host: siteConfig.url,
  };
}
