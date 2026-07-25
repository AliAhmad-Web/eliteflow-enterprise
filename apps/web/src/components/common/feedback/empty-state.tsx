import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
}

function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
  className,
  ...props
}: EmptyStateProps) {
  const showAction = Boolean(actionLabel && (onAction || actionHref));

  return (
    <div
      className={cn(
        "flex min-h-60 flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 py-10 text-center sm:min-h-70 sm:px-6 sm:py-12",
        className,
      )}
      role="status"
      {...props}
    >
      <div className="mb-4 icon-box icon-box-md rounded-xl bg-primary/10 shadow-(--shadow-xs) ring-1 ring-primary/15">
        <Icon className="text-primary" strokeWidth={1.75} aria-hidden="true" />
      </div>
      <h3 className="text-[0.9375rem] font-semibold tracking-tight text-foreground">
        {title}
      </h3>
      {description ? (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
      {showAction ? (
        actionHref ? (
          <Button asChild className="mt-6">
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        ) : (
          <Button className="mt-6" onClick={onAction}>
            {actionLabel}
          </Button>
        )
      ) : null}
    </div>
  );
}

export { EmptyState };
