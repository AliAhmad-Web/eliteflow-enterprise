import Image from "next/image";
import Link from "next/link";
import { BookOpen, Github, Globe } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { siteConfig } from "@/config/site.config";
import { ROUTES } from "@/constants/routes";
import {
  DownloadProductCard,
  ResourceLinkCard,
} from "@/features/downloads/components/download-product-card";
import {
  AndroidIcon,
  ChromeIcon,
  WindowsIcon,
} from "@/features/downloads/components/platform-icons";
import type { ReleaseCatalog } from "@/features/downloads/lib/discover-releases";
import {
  formatFileSize,
  formatReleaseDate,
} from "@/features/downloads/lib/format";

interface DownloadsPageContentProps {
  catalog: ReleaseCatalog;
}

export function DownloadsPageContent({ catalog }: DownloadsPageContentProps) {
  const desktopVersion = catalog.desktop.version ?? "—";
  const extensionVersion = catalog.extension.version ?? "—";
  const desktopReleaseDate =
    catalog.desktop.setup?.releasedAt ?? catalog.desktop.portable?.releasedAt;

  const desktopActions = [
    catalog.desktop.setup
      ? {
          label: "Download Desktop Installer",
          href: catalog.desktop.setup.href,
          variant: "default" as const,
        }
      : null,
    catalog.desktop.portable
      ? {
          label: "Download Portable Version",
          href: catalog.desktop.portable.href,
          variant: "outline" as const,
        }
      : null,
  ].filter((action): action is NonNullable<typeof action> => action !== null);

  const extensionActions = catalog.extension.zip
    ? [
        {
          label: "Download Chrome Extension",
          href: catalog.extension.zip.href,
          variant: "default" as const,
        },
      ]
    : [];

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,rgba(109,40,217,0.14),transparent_55%)] dark:bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,rgba(139,92,246,0.16),transparent_55%)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(59,130,246,0.06),transparent_40%)]"
        aria-hidden="true"
      />

      <header className="relative z-10 border-b border-border/50 bg-background/70 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            href={ROUTES.HOME}
            className="flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Image
              src="/brand/eliteflow-mark.svg"
              alt=""
              width={28}
              height={28}
              className="size-7"
              priority
              unoptimized
            />
            <span className="text-sm font-semibold tracking-tight">{siteConfig.name}</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href={ROUTES.LOGIN}>Sign in</Link>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main id="main-content" className="relative z-10">
        <section className="mx-auto max-w-6xl px-4 pb-10 pt-12 sm:px-6 sm:pb-12 sm:pt-16 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Production Release
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-[2.75rem]">
              EliteFlow Downloads
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Download the official EliteFlow desktop applications and browser
              extensions.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
              <Button asChild size="lg">
                <a href={siteConfig.webAppUrl}>
                  <Globe className="size-4" aria-hidden="true" />
                  Open Web Application
                </a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a
                  href={siteConfig.repositoryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github className="size-4" aria-hidden="true" />
                  View GitHub Repository
                </a>
              </Button>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="apps-heading"
          className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 lg:px-8"
        >
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2
                id="apps-heading"
                className="text-xl font-semibold tracking-tight text-foreground"
              >
                Applications
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Official builds detected from the EliteFlow release folders.
              </p>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <DownloadProductCard
              icon={<WindowsIcon />}
              title="Desktop Application"
              description="Native Windows client for EliteFlow — same workspace as the web app."
              badge={catalog.desktop.setup || catalog.desktop.portable ? "Windows" : "Unavailable"}
              badgeVariant={
                catalog.desktop.setup || catalog.desktop.portable ? "info" : "warning"
              }
              meta={[
                { label: "Current Version", value: desktopVersion },
                {
                  label: "Installer Size",
                  value: catalog.desktop.setup
                    ? formatFileSize(catalog.desktop.setup.sizeBytes)
                    : "—",
                },
                {
                  label: "Portable Size",
                  value: catalog.desktop.portable
                    ? formatFileSize(catalog.desktop.portable.sizeBytes)
                    : "—",
                },
                {
                  label: "Release Date",
                  value: formatReleaseDate(desktopReleaseDate),
                },
              ]}
              actions={desktopActions}
              footerNote={
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Prefer a guided setup? Read the{" "}
                  <Link
                    href={ROUTES.DOWNLOADS_DESKTOP_GUIDE}
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Desktop Installation Guide
                  </Link>
                  .
                </p>
              }
            />

            <DownloadProductCard
              icon={<ChromeIcon />}
              title="Chrome Extension"
              description="Manifest V3 extension for quick access to EliteFlow from your browser."
              badge={catalog.extension.zip ? "Chrome" : "Unavailable"}
              badgeVariant={catalog.extension.zip ? "info" : "warning"}
              meta={[
                { label: "Version", value: extensionVersion },
                {
                  label: "Package Size",
                  value: catalog.extension.zip
                    ? formatFileSize(catalog.extension.zip.sizeBytes)
                    : "—",
                },
                {
                  label: "Release Date",
                  value: formatReleaseDate(catalog.extension.zip?.releasedAt),
                },
                { label: "Format", value: "ZIP (Load unpacked)" },
              ]}
              actions={extensionActions}
              footerNote={
                <p className="text-xs leading-relaxed text-muted-foreground">
                  New to side-loading? Follow the{" "}
                  <Link
                    href={ROUTES.DOWNLOADS_EXTENSION_GUIDE}
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Chrome Extension Installation Guide
                  </Link>
                  .
                </p>
              }
            />

            <DownloadProductCard
              icon={<AndroidIcon />}
              title="Android Application"
              description="Mobile client for EliteFlow on Android. APK distribution is preparing for release."
              badge="Coming Soon"
              badgeVariant="secondary"
              meta={[
                { label: "Platform", value: "Android" },
                { label: "Status", value: "Coming Soon" },
                { label: "Package", value: "APK (not published)" },
                { label: "Availability", value: "—" },
              ]}
              comingSoon
            />
          </div>
        </section>

        <section
          aria-labelledby="resources-heading"
          className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8"
        >
          <div className="mb-6">
            <h2
              id="resources-heading"
              className="text-xl font-semibold tracking-tight text-foreground"
            >
              Resources
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Documentation, repository, and the live EliteFlow web app.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <ResourceLinkCard
              title="Desktop Installation Guide"
              description="Install EliteFlow Desktop with the NSIS installer or run the portable build."
              href={ROUTES.DOWNLOADS_DESKTOP_GUIDE}
              cta="Open guide"
            />
            <ResourceLinkCard
              title="Chrome Extension Installation Guide"
              description="Load the EliteFlow extension in Chrome using Developer mode."
              href={ROUTES.DOWNLOADS_EXTENSION_GUIDE}
              cta="Open guide"
            />
            <ResourceLinkCard
              title="Live Web Application"
              description="Use EliteFlow in the browser — same accounts, roles, and data as Desktop."
              href={siteConfig.webAppUrl}
              external
              cta="Open Web Application"
            />
            <ResourceLinkCard
              title="GitHub Repository"
              description="Source, issues, and enterprise release history for EliteFlow."
              href={siteConfig.repositoryUrl}
              external
              cta="View GitHub Repository"
            />
          </div>

          <div className="mt-8 flex items-start gap-3 rounded-xl border border-border/50 bg-card/70 px-4 py-3.5 text-sm text-muted-foreground">
            <BookOpen className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            <p>
              Release artifacts are detected automatically from{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-foreground">
                apps/desktop/release
              </code>{" "}
              and{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-foreground">
                apps/extension/release
              </code>
              . No manual file selection required.
            </p>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-border/50 bg-background/70">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
          <p>
            © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link href={ROUTES.LOGIN} className="hover:text-foreground">
              Sign in
            </Link>
            <a
              href={siteConfig.repositoryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
