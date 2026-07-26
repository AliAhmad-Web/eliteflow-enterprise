import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site.config";
import { ROUTES } from "@/constants/routes";

interface DownloadsGuideShellProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function DownloadsGuideShell({
  title,
  description,
  children,
}: DownloadsGuideShellProps) {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,rgba(109,40,217,0.14),transparent_55%)] dark:bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,rgba(139,92,246,0.16),transparent_55%)]"
        aria-hidden="true"
      />

      <header className="relative z-10 border-b border-border/50 bg-background/70 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href={ROUTES.DOWNLOADS}
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
            <span className="text-sm font-semibold tracking-tight">Downloads</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main id="main-content" className="relative z-10 mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          {siteConfig.name}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          {description}
        </p>

        <article className="mt-10 space-y-8 text-sm leading-relaxed text-foreground">
          {children}
        </article>

        <div className="mt-12 flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <Link href={ROUTES.DOWNLOADS}>Back to Downloads</Link>
          </Button>
          <Button asChild variant="outline">
            <a href={siteConfig.webAppUrl}>Open Web Application</a>
          </Button>
        </div>
      </main>
    </div>
  );
}

export function GuideSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border/50 bg-card/90 p-5 shadow-(--shadow-xs) sm:p-6">
      <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
      <div className="mt-3 space-y-3 text-muted-foreground">{children}</div>
    </section>
  );
}
