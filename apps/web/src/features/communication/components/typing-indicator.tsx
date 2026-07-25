"use client";

import { cn } from "@/lib/utils";

interface TypingIndicatorProps {
  label: string | null;
  className?: string;
}

export function TypingIndicator({ label, className }: TypingIndicatorProps) {
  if (!label) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-1 text-xs text-muted-foreground",
        className,
      )}
      aria-live="polite"
    >
      <span className="inline-flex items-center gap-0.5 rounded-full bg-muted px-2 py-1">
        <TypingDot delay="0ms" />
        <TypingDot delay="150ms" />
        <TypingDot delay="300ms" />
      </span>
      <span className="truncate">{label}</span>
    </div>
  );
}

function TypingDot({ delay }: { delay: string }) {
  return (
    <span
      className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/80 motion-reduce:animate-none"
      style={{ animationDelay: delay }}
    />
  );
}
