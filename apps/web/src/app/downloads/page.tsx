import type { Metadata } from "next";

import { siteConfig } from "@/config/site.config";
import { ROUTES } from "@/constants/routes";
import { DownloadsPageContent } from "@/features/downloads/components/downloads-page-content";
import { discoverReleases } from "@/features/downloads/lib/discover-releases";
import { PublicPageJsonLd } from "@/features/seo/json-ld/seo-json-ld-script";
import { composePublicPageMetadata } from "@/features/seo/metadata/compose-public-page-metadata";

const TITLE = "EliteFlow Downloads";
const DESCRIPTION =
  "Download the official EliteFlow desktop, Chrome extension, and Android APK. Windows installer, portable build, extension ZIP, and mobile APK.";
const OG_DESCRIPTION =
  "Download EliteFlow for Windows, Chrome, and Android — same workspace as the web app.";

const BASELINE: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: ROUTES.DOWNLOADS,
  },
  openGraph: {
    title: TITLE,
    description: OG_DESCRIPTION,
    url: `${siteConfig.url}${ROUTES.DOWNLOADS}`,
    siteName: siteConfig.name,
    type: "website",
    images: [
      {
        url: "/brand/eliteflow-mark.svg",
        width: 32,
        height: 32,
        alt: siteConfig.name,
      },
    ],
  },
  twitter: {
    card: "summary",
    title: TITLE,
    description: OG_DESCRIPTION,
  },
};

export const metadata: Metadata = composePublicPageMetadata({
  path: ROUTES.DOWNLOADS,
  title: TITLE,
  description: DESCRIPTION,
  openGraphDescription: OG_DESCRIPTION,
  keywords: [
    "EliteFlow",
    "download",
    "desktop",
    "Chrome extension",
    "Android APK",
    "business management",
  ],
  openGraphType: "website",
  twitterCard: "summary_large_image",
  baseline: BASELINE,
});

export default function DownloadsPage() {
  const catalog = discoverReleases();
  return (
    <>
      <PublicPageJsonLd
        name={TITLE}
        path={ROUTES.DOWNLOADS}
        description={DESCRIPTION}
        breadcrumbs={[{ name: "Downloads", path: ROUTES.DOWNLOADS }]}
      />
      <DownloadsPageContent catalog={catalog} />
    </>
  );
}
