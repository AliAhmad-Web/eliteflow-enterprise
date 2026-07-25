"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function ConversationListSkeleton({
  className,
  rows = 8,
}: {
  className?: string;
  rows?: number;
}) {
  return (
    <div
      className={cn("space-y-1 px-2 py-3", className)}
      role="status"
      aria-label="Loading conversations"
    >
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="flex items-start gap-3 rounded-lg px-2.5 py-2.5"
        >
          <Skeleton className="mt-0.5 h-10 w-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3 w-10" />
            </div>
            <Skeleton className="h-3 w-full max-w-[180px]" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChatThreadSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex h-full flex-col", className)}
      role="status"
      aria-label="Loading conversation"
    >
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Skeleton className="h-9 w-9 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-36" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="flex-1 space-y-4 px-4 py-5">
        <BubbleSkeleton align="left" wide />
        <BubbleSkeleton align="right" />
        <BubbleSkeleton align="left" />
        <BubbleSkeleton align="right" wide />
        <BubbleSkeleton align="left" />
      </div>
      <div className="border-t border-border px-3 py-3">
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    </div>
  );
}

function BubbleSkeleton({
  align,
  wide = false,
}: {
  align: "left" | "right";
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex",
        align === "right" ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "space-y-2 rounded-2xl border border-border/50 bg-card/40 p-3",
          wide ? "w-[min(78%,22rem)]" : "w-[min(60%,16rem)]",
        )}
      >
        <Skeleton className="h-3 w-[80%]" />
        <Skeleton className="h-3 w-[60%]" />
      </div>
    </div>
  );
}

export function ActivityFeedSkeleton({
  className,
  rows = 6,
}: {
  className?: string;
  rows?: number;
}) {
  return (
    <div
      className={cn("space-y-3", className)}
      role="status"
      aria-label="Loading activities"
    >
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex gap-4">
          <Skeleton className="mt-1 h-9 w-9 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2 rounded-lg border border-border bg-card px-4 py-3">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-full" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-4 w-16 rounded-full" />
              <Skeleton className="h-4 w-24 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CommentsPanelSkeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn("space-y-3 p-3", className)}
      role="status"
      aria-label="Loading comments"
    >
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="space-y-2 rounded-lg border border-border p-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-7 rounded-full" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}

export function SearchResultsSkeleton({
  className,
  rows = 6,
}: {
  className?: string;
  rows?: number;
}) {
  return (
    <div
      className={cn("space-y-2 px-2 py-3", className)}
      role="status"
      aria-label="Searching"
    >
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="space-y-2 rounded-lg px-3 py-2">
          <Skeleton className="h-3.5 w-2/5" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      ))}
    </div>
  );
}
