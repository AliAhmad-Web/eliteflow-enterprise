"use client";

import type { AnalyticsDashboard, ChartPoint, KpiCard } from "@enterprise/shared";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

import { MetricTrend } from "@/components/common/display/metric-trend";
import { EmptyState } from "@/components/common/feedback/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { maybeMemo } from "@/features/performance";
import { cn } from "@/lib/utils";

import { formatKpiValue, formatPercent } from "../types/reports.types";
import { ReportsSparkline } from "./reports-sparkline";

function mapTrend(trend: KpiCard["trend"]) {
  if (trend === "flat") return "neutral" as const;
  if (trend === "up" || trend === "down") return trend;
  return "neutral" as const;
}

function seriesForKpi(
  key: string,
  data: AnalyticsDashboard | undefined,
): ChartPoint[] | undefined {
  if (!data) return undefined;
  switch (key) {
    case "revenue":
      return data.revenueTrend;
    case "clients_active":
      return data.clientGrowth;
    case "task_completion":
      return data.taskStatus;
    case "collection_rate":
      return data.invoiceStatus;
    case "attendance":
      return data.attendanceBreakdown;
    case "productivity":
      return data.employeeProductivity;
    default:
      return data.revenueTrend;
  }
}

function TrendGlyph({ trend }: { trend: KpiCard["trend"] }) {
  if (trend === "up") {
    return <TrendingUp className="h-4 w-4 text-emerald-600" aria-hidden />;
  }
  if (trend === "down") {
    return <TrendingDown className="h-4 w-4 text-destructive" aria-hidden />;
  }
  return <Minus className="h-4 w-4 text-muted-foreground" aria-hidden />;
}

export interface ReportsKpiSectionProps {
  kpis: KpiCard[];
  enhanced?: boolean;
  dashboard?: AnalyticsDashboard;
}

export function ReportsKpiSectionComponent({
  kpis,
  enhanced = false,
  dashboard,
}: ReportsKpiSectionProps) {
  if (kpis.length === 0) {
    return (
      <EmptyState
        title="No KPIs available"
        description="Analytics data for this period is not available yet."
      />
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi) => {
        const sparkPoints = enhanced
          ? seriesForKpi(kpi.key, dashboard)
          : undefined;

        return (
          <Card
            key={kpi.key}
            className={cn(
              "border-border/50",
              enhanced &&
                kpi.trend === "up" &&
                "border-l-2 border-l-emerald-500/70",
              enhanced &&
                kpi.trend === "down" &&
                "border-l-2 border-l-destructive/70",
            )}
          >
            <CardContent className="space-y-3 p-4 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    {kpi.label}
                  </p>
                  <p
                    className={cn(
                      "font-bold tracking-tight text-foreground",
                      enhanced ? "text-3xl" : "text-2xl",
                    )}
                  >
                    {formatKpiValue(kpi)}
                  </p>
                  {kpi.changePercent != null && kpi.trend ? (
                    enhanced ? (
                      <div className="flex items-center gap-1.5 text-xs">
                        <TrendGlyph trend={kpi.trend} />
                        <span
                          className={cn(
                            kpi.trend === "up" && "text-emerald-600",
                            kpi.trend === "down" && "text-destructive",
                            kpi.trend === "flat" && "text-muted-foreground",
                          )}
                        >
                          {formatPercent(kpi.changePercent)}
                        </span>
                      </div>
                    ) : (
                      <MetricTrend
                        value={kpi.changePercent}
                        trend={mapTrend(kpi.trend)}
                      />
                    )
                  ) : null}
                </div>
                {enhanced && sparkPoints && sparkPoints.length > 1 ? (
                  <ReportsSparkline points={sparkPoints} />
                ) : (
                  <div className="icon-box icon-box-md rounded-xl bg-primary/10">
                    <TrendingUp
                      className="h-5 w-5 text-primary"
                      aria-hidden="true"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export const ReportsKpiSection = maybeMemo(ReportsKpiSectionComponent);
