"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function AiConversationListSkeleton({
  rows = 6,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)} aria-hidden>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="rounded-xl border border-transparent px-2.5 py-2.5"
        >
          <Skeleton className="h-3.5 w-2/3" />
          <Skeleton className="mt-2 h-3 w-full" />
        </div>
      ))}
    </div>
  );
}

export function AiMessageThreadSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4 px-4 py-4", className)} aria-hidden>
      <div className="mr-8 rounded-xl border border-border/50 bg-card/80 px-4 py-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="mt-3 h-3 w-full" />
        <Skeleton className="mt-2 h-3 w-4/5" />
      </div>
      <div className="ml-8 rounded-xl border border-primary/25 bg-primary/8 px-4 py-3">
        <Skeleton className="h-3 w-10" />
        <Skeleton className="mt-3 h-3 w-3/4" />
      </div>
      <div className="mr-8 rounded-xl border border-border/50 bg-card/80 px-4 py-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="mt-3 h-3 w-full" />
        <Skeleton className="mt-2 h-3 w-2/3" />
      </div>
    </div>
  );
}
