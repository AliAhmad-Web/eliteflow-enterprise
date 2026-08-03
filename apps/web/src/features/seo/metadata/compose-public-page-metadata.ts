import type { Metadata } from "next";

import { siteConfig } from "@/config/site.config";

import {
  isSeoCanonicalUrlsEnabled,
  isSeoCitationOptimizationEnabled,
  isSeoDynamicMetadataEnabled,
  isSeoOpenGraphEnabled,
  isSeoTwitterCardsEnabled,
} from "../feature-flags";

const DEFAULT_OG_IMAGE = {
  url: "/brand/eliteflow-mark.svg",
  width: 32,
  height: 32,
  alt: siteConfig.name,
} as const;

export type PublicPageTwitterCard = "summary" | "summary_large_image";

export type ComposePublicPageMetadataInput = {
  /** Absolute path under metadataBase (e.g. `/downloads`). */
  path: string;
  title: string;
  description: string;
  /** Optional OG-specific description; defaults to description. */
  openGraphDescription?: string;
  keywords?: readonly string[];
  openGraphType?: "website" | "article";
  twitterCard?: PublicPageTwitterCard;
  /**
   * Exact pre–Phase-2 metadata. Returned unchanged when no metadata-related
   * SEO flags are ON (backward compatible).
   */
  baseline: Metadata;
};

function anyPublicMetadataFlagOn(): boolean {
  return (
    isSeoDynamicMetadataEnabled() ||
    isSeoOpenGraphEnabled() ||
    isSeoTwitterCardsEnabled() ||
    isSeoCanonicalUrlsEnabled() ||
    isSeoCitationOptimizationEnabled()
  );
}

/**
 * Composes public-page Metadata behind SEO_* flags.
 * When all related flags are OFF → returns `baseline` (bit-identical to Phase 1).
 * When any flag is ON → starts from baseline and overlays enabled slices only.
 */
export function composePublicPageMetadata(
  input: ComposePublicPageMetadataInput,
): Metadata {
  if (!anyPublicMetadataFlagOn()) {
    return input.baseline;
  }

  const absoluteUrl = `${siteConfig.url}${input.path}`;
  const title = input.title;
  let description = input.description;

  if (isSeoCitationOptimizationEnabled()) {
    const brandClause = `${siteConfig.name} — ${siteConfig.tagline}.`;
    if (!description.includes(siteConfig.name)) {
      description = `${description} ${brandClause}`.trim();
    }
  }

  const metadata: Metadata = {
    ...input.baseline,
    title,
    description,
  };

  if (isSeoDynamicMetadataEnabled() && input.keywords?.length) {
    metadata.keywords = [...input.keywords];
  }

  if (isSeoCanonicalUrlsEnabled()) {
    metadata.alternates = {
      ...(typeof metadata.alternates === "object" ? metadata.alternates : {}),
      canonical: input.path,
    };
    metadata.robots = {
      index: true,
      follow: true,
    };
  }

  const ogDescription = input.openGraphDescription ?? description;

  if (isSeoOpenGraphEnabled()) {
    metadata.openGraph = {
      title,
      description: ogDescription,
      url: absoluteUrl,
      siteName: siteConfig.name,
      type: input.openGraphType ?? "website",
      images: [DEFAULT_OG_IMAGE],
    };
  }

  if (isSeoTwitterCardsEnabled()) {
    metadata.twitter = {
      card: input.twitterCard ?? "summary",
      title,
      description: ogDescription,
      images: [DEFAULT_OG_IMAGE.url],
    };
  }

  return metadata;
}

/** Metadata for auth / dashboard / private surfaces when SEO_ROBOTS is ON. */
export function composePrivateSurfaceMetadata(
  baseline: Metadata,
  robotsEnabled: boolean,
): Metadata {
  if (!robotsEnabled) {
    return baseline;
  }

  return {
    ...baseline,
    robots: {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    },
  };
}
