"use client";

import { LoadingState } from "@/components/common/feedback/loading-state";
import { Button } from "@/components/ui/button";

interface RedirectFallbackProps {
  label: string;
  timedOut: boolean;
  timeoutMessage: string;
  actionLabel: string;
  onAction: () => void;
}

/**
 * Shared loading / timeout UI used by auth and role route guards.
 */
export function RedirectFallback({
  label,
  timedOut,
  timeoutMessage,
  actionLabel,
  onAction,
}: RedirectFallbackProps) {
  if (timedOut) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="max-w-sm text-sm text-muted-foreground">{timeoutMessage}</p>
        <Button type="button" onClick={onAction}>
          {actionLabel}
        </Button>
      </div>
    );
  }

  return <LoadingState label={label} className="min-h-screen" />;
}
