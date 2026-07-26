import type { Metadata } from "next";

import { siteConfig } from "@/config/site.config";
import { DownloadsPageContent } from "@/features/downloads/components/downloads-page-content";
import { discoverReleases } from "@/features/downloads/lib/discover-releases";

export const metadata: Metadata = {
  title: "EliteFlow Downloads",
  description:
    "Download the official EliteFlow desktop, Chrome extension, and Android APK. Windows installer, portable build, extension ZIP, and mobile APK.",
  alternates: {
    canonical: "/downloads",
  },
  openGraph: {
    title: "EliteFlow Downloads",
    description:
      "Download EliteFlow for Windows, Chrome, and Android — same workspace as the web app.",
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
      "Download EliteFlow for Windows, Chrome, and Android — same workspace as the web app.",
  },
};

export default function DownloadsPage() {
  const catalog = discoverReleases();
  return <DownloadsPageContent catalog={catalog} />;
}
