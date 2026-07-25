import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { cn } from "@/lib/utils";

import type { TrendDirection } from "@/features/dashboard/types/dashboard.types";

interface MetricTrendProps {
  value: number;
  trend: TrendDirection;
  className?: string;
}

export function MetricTrend({ value, trend, className }: MetricTrendProps) {
  const isPositive = trend === "up";
  const isNegative = trend === "down";
  const formatted = `${value > 0 ? "+" : ""}${value}%`;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium tabular-nums",
        isPositive && "text-success",
        isNegative && "text-destructive",
        trend === "neutral" && "text-muted-foreground",
        className,
      )}
      aria-label={`${formatted} change`}
    >
      {isPositive ? (
        <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
      ) : isNegative ? (
        <ArrowDownRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
      ) : (
        <Minus className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
      )}
      {formatted}
    </span>
  );
}
