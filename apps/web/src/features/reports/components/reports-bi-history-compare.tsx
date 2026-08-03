"use client";

import type { KpiCard } from "@enterprise/shared";
import { History } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { buildHistoricalComparisonRows } from "../utils/bi-composition";

export interface ReportsBiHistoryCompareProps {
  kpis: KpiCard[];
}

export function ReportsBiHistoryCompare({ kpis }: ReportsBiHistoryCompareProps) {
  const rows = buildHistoricalComparisonRows(kpis);
  if (rows.length === 0) return null;

  return (
    <Card className="border-border/50">
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <History className="h-5 w-5 text-primary" aria-hidden="true" />
          Historical comparison
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Client-side comparison from KPI change and trend fields (no new API)
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-2 pr-3 font-medium">Metric</th>
                <th className="pb-2 pr-3 font-medium">Current</th>
                <th className="pb-2 font-medium">Vs prior</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b border-border/50">
                  <td className="py-2 pr-3 text-foreground">{row.label}</td>
                  <td className="py-2 pr-3 text-foreground">{row.current}</td>
                  <td className="py-2 text-muted-foreground">{row.changeLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
