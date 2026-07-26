import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Download, ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetaRow {
  label: string;
  value: string;
}

interface DownloadAction {
  label: string;
  href: string;
  download?: boolean;
  external?: boolean;
  variant?: "default" | "outline" | "secondary";
}

interface DownloadProductCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "success" | "warning" | "info" | "outline";
  meta: MetaRow[];
  actions?: DownloadAction[];
  footerNote?: ReactNode;
  comingSoon?: boolean;
  className?: string;
}

export function DownloadProductCard({
  icon,
  title,
  description,
  badge,
  badgeVariant = "default",
  meta,
  actions = [],
  footerNote,
  comingSoon = false,
  className,
}: DownloadProductCardProps) {
  return (
    <Card
      className={cn(
        "group flex h-full flex-col border-border/50 bg-card/90",
        "hover:border-primary/25 hover:shadow-(--shadow-md)",
        comingSoon && "opacity-95",
        className,
      )}
    >
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl border border-border/60 bg-accent/60 text-primary shadow-(--shadow-xs)">
            {icon}
          </div>
          {badge ? <Badge variant={badgeVariant}>{badge}</Badge> : null}
        </div>
        <div className="space-y-1.5">
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        <dl className="grid gap-2.5 sm:grid-cols-2">
          {meta.map((row) => (
            <div
              key={row.label}
              className="rounded-lg border border-border/50 bg-muted/40 px-3 py-2.5"
            >
              <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {row.label}
              </dt>
              <dd className="mt-1 text-sm font-medium text-foreground">{row.value}</dd>
            </div>
          ))}
        </dl>
        {footerNote}
      </CardContent>

      <CardFooter className="mt-auto flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap">
        {comingSoon ? (
          <Button disabled variant="secondary" className="w-full sm:w-auto">
            Coming Soon
          </Button>
        ) : (
          actions.map((action) => {
            const content = (
              <>
                {action.external ? (
                  <ExternalLink className="size-4" aria-hidden="true" />
                ) : (
                  <Download className="size-4" aria-hidden="true" />
                )}
                {action.label}
              </>
            );

            if (action.external) {
              return (
                <Button
                  key={action.label}
                  asChild
                  variant={action.variant ?? "outline"}
                  className="w-full sm:w-auto"
                >
                  <a href={action.href} target="_blank" rel="noopener noreferrer">
                    {content}
                  </a>
                </Button>
              );
            }

            return (
              <Button
                key={action.label}
                asChild
                variant={action.variant ?? "default"}
                className="w-full sm:w-auto"
              >
                <a
                  href={action.href}
                  download={action.download !== false}
                >
                  {content}
                </a>
              </Button>
            );
          })
        )}
      </CardFooter>
    </Card>
  );
}

interface ResourceLinkCardProps {
  title: string;
  description: string;
  href: string;
  external?: boolean;
  cta: string;
}

export function ResourceLinkCard({
  title,
  description,
  href,
  external = false,
  cta,
}: ResourceLinkCardProps) {
  return (
    <Card className="border-border/50 bg-card/90 hover:border-primary/25 hover:shadow-(--shadow-md)">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardFooter>
        <Button asChild variant="outline">
          {external ? (
            <a href={href} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" aria-hidden="true" />
              {cta}
            </a>
          ) : (
            <Link href={href}>
              <ArrowRight className="size-4" aria-hidden="true" />
              {cta}
            </Link>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
