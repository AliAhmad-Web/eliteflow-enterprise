"use client";

import type { AiInsight, KpiCard } from "@enterprise/shared";
import { Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { formatKpiValue } from "../types/reports.types";

export interface ReportsBusinessSummaryProps {
  insight: AiInsight;
  kpis: KpiCard[];
}

export function ReportsBusinessSummary({
  insight,
  kpis,
}: ReportsBusinessSummaryProps) {
  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
          Business summary
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Generated {new Date(insight.generatedAt).toLocaleString()}
          {insight.provider ? ` · ${insight.provider}` : ""}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-relaxed text-foreground">
          {insight.summary}
        </p>
        {kpis.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {kpis.slice(0, 6).map((kpi) => (
              <div
                key={kpi.key}
                className="rounded-lg border border-border/40 bg-muted/20 px-3 py-2"
              >
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className="mt-0.5 text-sm font-semibold text-foreground">
                  {formatKpiValue(kpi)}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
