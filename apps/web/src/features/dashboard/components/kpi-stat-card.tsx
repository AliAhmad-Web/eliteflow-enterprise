"use client";

import { motion } from "framer-motion";

import { MetricTrend } from "@/components/common/display/metric-trend";
import { Card, CardContent } from "@/components/ui/card";
import { slideUp } from "@/lib/motion";
import { cn } from "@/lib/utils";

import type { KpiStat } from "@/features/dashboard/types/dashboard.types";

interface KpiStatCardProps {
  stat: KpiStat;
  className?: string;
}

export function KpiStatCard({ stat, className }: KpiStatCardProps) {
  const Icon = stat.icon;

  return (
    <motion.div {...slideUp} className="min-w-0">
      <Card
        className={cn(
          "kpi-card-v3 h-full border-border/50 bg-card/95 hover:border-primary/20 hover:shadow-[var(--shadow-md)]",
          className,
        )}
      >
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-2.5">
              <p className="truncate text-sm font-medium leading-5 text-muted-foreground">
                {stat.label}
              </p>
              <p className="truncate text-[1.75rem] font-semibold leading-8 tracking-tight text-foreground tabular-nums">
                {stat.value}
              </p>
              <MetricTrend value={stat.change} trend={stat.trend} />
            </div>
            <div
              className={cn(
                "icon-box icon-box-md rounded-xl bg-primary/10 ring-1 ring-primary/15",
                stat.iconClassName,
              )}
            >
              <Icon strokeWidth={1.75} aria-hidden="true" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface KpiStatsGridProps {
  stats: KpiStat[];
  className?: string;
}

export function KpiStatsGrid({ stats, className }: KpiStatsGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4",
        className,
      )}
      role="list"
      aria-label="Key performance indicators"
    >
      {stats.map((stat) => (
        <div key={stat.id} role="listitem" className="min-w-0">
          <KpiStatCard stat={stat} />
        </div>
      ))}
    </div>
  );
}
