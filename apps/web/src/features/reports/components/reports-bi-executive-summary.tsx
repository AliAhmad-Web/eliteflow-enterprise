"use client";

import type { AiInsight, AnalyticsDashboard } from "@enterprise/shared";
import { Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  formatKpiValue,
  formatPercent,
} from "../types/reports.types";
import {
  buildBusinessHealthScore,
  buildExecutiveAiSummary,
  buildExecutiveKpiHighlights,
  buildOperationalOverview,
} from "../utils/bi-composition";

export interface ReportsBiExecutiveSummaryProps {
  data: AnalyticsDashboard;
  insight?: AiInsight;
}

export function ReportsBiExecutiveSummary({
  data,
  insight,
}: ReportsBiExecutiveSummaryProps) {
  const health = buildBusinessHealthScore(data);
  const highlights = buildExecutiveKpiHighlights(data.kpis);
  const revenueKpi = highlights.find((k) =>
    k.key.toLowerCase().includes("revenue"),
  );
  const aiSummary = buildExecutiveAiSummary(insight, data);
  const operational = buildOperationalOverview(data);

  return (
    <Card className="border-border/50 border-l-2 border-l-primary/40">
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
          Executive business summary
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Composed from current analytics
          {insight?.generatedAt
            ? ` · AI insight ${new Date(insight.generatedAt).toLocaleString()}`
            : ""}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-border/50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Business health
            </p>
            <p className="mt-1 text-2xl font-semibold text-foreground">
              {health.overall}
            </p>
            <p className="text-xs capitalize text-muted-foreground">
              {health.tone}
            </p>
          </div>
          <div className="rounded-lg border border-border/50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Revenue snapshot
            </p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {revenueKpi ? formatKpiValue(revenueKpi) : "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {revenueKpi && typeof revenueKpi.changePercent === "number"
                ? formatPercent(revenueKpi.changePercent)
                : `${data.revenueTrend.length} trend points`}
            </p>
          </div>
          {highlights.slice(0, 2).map((kpi) => (
            <div
              key={kpi.key}
              className="rounded-lg border border-border/50 p-3"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {kpi.label}
              </p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {formatKpiValue(kpi)}
              </p>
              <p className="text-xs text-muted-foreground">
                {typeof kpi.changePercent === "number"
                  ? formatPercent(kpi.changePercent)
                  : "KPI highlight"}
              </p>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">
            Operational overview
          </p>
          <p className="text-sm text-muted-foreground">{operational}</p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">
            Executive AI summary
          </p>
          <p className="text-sm leading-relaxed text-foreground">{aiSummary}</p>
        </div>
      </CardContent>
    </Card>
  );
}
