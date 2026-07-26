import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig } from "@/config/site.config";
import { ROUTES } from "@/constants/routes";
import {
  DownloadsGuideShell,
  GuideSection,
} from "@/features/downloads/components/downloads-guide-shell";
import { discoverReleases } from "@/features/downloads/lib/discover-releases";

export const metadata: Metadata = {
  title: "Desktop Installation Guide",
  description:
    "Install EliteFlow Desktop on Windows using the official installer or portable build.",
  openGraph: {
    title: "Desktop Installation Guide | EliteFlow",
    description:
      "Install EliteFlow Desktop on Windows using the official installer or portable build.",
    url: `${siteConfig.url}/downloads/desktop`,
    siteName: siteConfig.name,
    type: "article",
  },
  twitter: {
    card: "summary",
    title: "Desktop Installation Guide | EliteFlow",
    description:
      "Install EliteFlow Desktop on Windows using the official installer or portable build.",
  },
};

export default function DesktopInstallGuidePage() {
  const catalog = discoverReleases();
  const setupHref = catalog.desktop.setup?.href;
  const portableHref = catalog.desktop.portable?.href;
  const version = catalog.desktop.version ?? "1.0.0";

  return (
    <DownloadsGuideShell
      title="Desktop Installation Guide"
      description="Install the official EliteFlow Desktop client for Windows. The desktop shell loads the same EliteFlow web application — no separate backend or database."
    >
      <GuideSection title="Prerequisites">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Windows 10 or Windows 11 (x64)</li>
          <li>An existing EliteFlow account</li>
          <li>
            Network access to the EliteFlow web app and API
          </li>
        </ul>
      </GuideSection>

      <GuideSection title="Option A — Installer (recommended)">
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Download{" "}
            {setupHref ? (
              <a
                href={setupHref}
                download
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                EliteFlow Desktop Installer
              </a>
            ) : (
              <span>the EliteFlow Desktop Installer from the Downloads page</span>
            )}
            .
          </li>
          <li>Run the setup executable and follow the prompts.</li>
          <li>Launch EliteFlow from the Start menu or desktop shortcut.</li>
          <li>Sign in with your EliteFlow email and password.</li>
        </ol>
        <p>
          Current version: <strong className="text-foreground">{version}</strong>
        </p>
      </GuideSection>

      <GuideSection title="Option B — Portable">
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Download{" "}
            {portableHref ? (
              <a
                href={portableHref}
                download
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                EliteFlow Portable
              </a>
            ) : (
              <span>the portable build from the Downloads page</span>
            )}
            .
          </li>
          <li>Place the executable in a folder you control.</li>
          <li>Run it directly — no installer required.</li>
          <li>Sign in with your EliteFlow credentials.</li>
        </ol>
      </GuideSection>

      <GuideSection title="After install">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Session persistence keeps you signed in across restarts.</li>
          <li>
            Desktop uses the same roles, permissions, AI, files, and notifications as
            the web app.
          </li>
          <li>
            Prefer the browser?{" "}
            <a
              href={siteConfig.webAppUrl}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Open the web application
            </a>
            .
          </li>
        </ul>
        <p>
          Need the package again? Return to the{" "}
          <Link
            href={ROUTES.DOWNLOADS}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Download Center
          </Link>
          .
        </p>
      </GuideSection>
    </DownloadsGuideShell>
  );
}
