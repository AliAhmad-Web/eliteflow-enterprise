"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function ReportsKpiSkeleton({
  count = 4,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("grid gap-3 sm:grid-cols-2 xl:grid-cols-4", className)}
      aria-hidden
      aria-label="Loading KPIs"
    >
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="rounded-xl border border-border/50 bg-card p-4 sm:p-6"
        >
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-7 w-32" />
          <Skeleton className="mt-3 h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

export function ReportsChartSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/50 bg-card p-4 sm:p-6",
        className,
      )}
      aria-hidden
      aria-label="Loading chart"
    >
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-6 h-48 w-full" />
    </div>
  );
}

export function ReportsAnalyticsSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6", className)}>
      <ReportsKpiSkeleton />
      <div className="grid gap-4 lg:grid-cols-2">
        <ReportsChartSkeleton />
        <ReportsChartSkeleton />
      </div>
    </div>
  );
}

export function ReportsInsightSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4", className)} aria-hidden>
      <div className="rounded-xl border border-border/50 bg-card p-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="mt-4 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-5/6" />
        <Skeleton className="mt-2 h-4 w-2/3" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    </div>
  );
}
