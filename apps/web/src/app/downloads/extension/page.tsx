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
  title: "Chrome Extension Installation Guide",
  description:
    "Install the EliteFlow Chrome extension from the official ZIP package using Developer mode.",
  openGraph: {
    title: "Chrome Extension Installation Guide | EliteFlow",
    description:
      "Install the EliteFlow Chrome extension from the official ZIP package using Developer mode.",
    url: `${siteConfig.url}/downloads/extension`,
    siteName: siteConfig.name,
    type: "article",
  },
  twitter: {
    card: "summary",
    title: "Chrome Extension Installation Guide | EliteFlow",
    description:
      "Install the EliteFlow Chrome extension from the official ZIP package using Developer mode.",
  },
};

export default function ExtensionInstallGuidePage() {
  const catalog = discoverReleases();
  const zipHref = catalog.extension.zip?.href;
  const version = catalog.extension.version ?? "1.0.0";

  return (
    <DownloadsGuideShell
      title="Chrome Extension Installation Guide"
      description="Load the official EliteFlow Manifest V3 extension in Google Chrome (or Chromium-based Edge) from the production ZIP package."
    >
      <GuideSection title="Prerequisites">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Google Chrome 116+ (or Chromium-based Edge)</li>
          <li>An existing EliteFlow account</li>
        </ul>
        <p>
          Package version: <strong className="text-foreground">{version}</strong>
        </p>
      </GuideSection>

      <GuideSection title="Install from ZIP">
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Download{" "}
            {zipHref ? (
              <a
                href={zipHref}
                download
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                EliteFlow Chrome Extension
              </a>
            ) : (
              <span>the extension ZIP from the Downloads page</span>
            )}
            .
          </li>
          <li>
            Unzip the archive to a folder you will keep (do not delete it after
            install).
          </li>
          <li>
            Open Chrome and go to{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-foreground">
              chrome://extensions
            </code>
            .
          </li>
          <li>Enable Developer mode (top-right).</li>
          <li>Click Load unpacked.</li>
          <li>
            Select the unzipped folder — it must contain{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-foreground">
              manifest.json
            </code>
            .
          </li>
          <li>Pin EliteFlow from the extensions puzzle menu.</li>
        </ol>
      </GuideSection>

      <GuideSection title="Sign in">
        <ol className="list-decimal space-y-2 pl-5">
          <li>Click the EliteFlow extension icon.</li>
          <li>Sign in with your EliteFlow email and password.</li>
          <li>If your organization requires OTP, enter the verification code.</li>
          <li>
            Session persists via Chrome Storage — reopen the popup later without
            signing in again.
          </li>
        </ol>
      </GuideSection>

      <GuideSection title="Verify after install">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Login succeeds with EliteFlow credentials</li>
          <li>Dashboard shows tasks, notifications, and projects</li>
          <li>AI tab accepts prompts</li>
          <li>Toolbar badge reflects notifications</li>
          <li>
            Context menu: select text → Send to EliteFlow AI
          </li>
        </ul>
        <p>
          Prefer the full product UI?{" "}
          <a
            href={siteConfig.webAppUrl}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Open the web application
          </a>{" "}
          or return to the{" "}
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
