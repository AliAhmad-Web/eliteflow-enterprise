import type { Metadata } from "next";

import { siteConfig } from "@/config/site.config";
import { DownloadsPageContent } from "@/features/downloads/components/downloads-page-content";
import { discoverReleases } from "@/features/downloads/lib/discover-releases";

export const metadata: Metadata = {
  title: "EliteFlow Downloads",
  description:
    "Download the official EliteFlow desktop applications and browser extensions. Windows installer, portable build, and Chrome extension.",
  alternates: {
    canonical: "/downloads",
  },
  openGraph: {
    title: "EliteFlow Downloads",
    description:
      "Download the official EliteFlow desktop applications and browser extensions.",
    url: `${siteConfig.url}/downloads`,
    siteName: siteConfig.name,
    type: "website",
    images: [
      {
        url: "/brand/eliteflow-mark.svg",
        width: 32,
        height: 32,
        alt: "EliteFlow",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "EliteFlow Downloads",
    description:
      "Download the official EliteFlow desktop applications and browser extensions.",
  },
};

export default function DownloadsPage() {
  const catalog = discoverReleases();
  return <DownloadsPageContent catalog={catalog} />;
}
