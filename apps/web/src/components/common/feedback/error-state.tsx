import type { LucideIcon } from "lucide-react";
import { AlertCircle } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  retryLabel?: string;
  onRetry?: () => void;
}

function ErrorState({
  icon: Icon = AlertCircle,
  title = "Something went wrong",
  description = "We could not load this content. Please try again.",
  retryLabel = "Try again",
  onRetry,
  className,
  ...props
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-10 text-center sm:min-h-[280px] sm:px-6 sm:py-12",
        className,
      )}
      role="alert"
      {...props}
    >
      <div className="mb-4 icon-box icon-box-lg rounded-full bg-destructive/10">
        <Icon className="text-destructive" strokeWidth={1.75} aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
      {onRetry ? (
        <Button className="mt-6" variant="secondary" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}

export { ErrorState };
