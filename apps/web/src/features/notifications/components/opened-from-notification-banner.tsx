"use client";

import { Bell, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface OpenedFromNotificationBannerProps {
  visible: boolean;
  onDismiss: () => void;
  className?: string;
}

export function OpenedFromNotificationBanner({
  visible,
  onDismiss,
  className,
}: OpenedFromNotificationBannerProps) {
  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary/10 px-4 py-2.5",
        "animate-in fade-in-0 slide-in-from-top-2 duration-300",
        className,
      )}
    >
      <div className="flex items-center gap-2 text-sm text-foreground">
        <Bell className="h-4 w-4 text-primary" aria-hidden />
        <span className="font-medium">Opened from Notification</span>
        <span className="hidden text-muted-foreground sm:inline">
          — focused the related record for you
        </span>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Dismiss notification context banner"
        onClick={onDismiss}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
