"use client";

import type { AnalyticsDashboard } from "@enterprise/shared";
import { Activity } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import {
  buildBusinessHealthScore,
  type BiHealthTone,
} from "../utils/bi-composition";

export interface ReportsBiHealthProps {
  data: AnalyticsDashboard;
}

function toneClass(tone: BiHealthTone): string {
  switch (tone) {
    case "strong":
      return "text-emerald-700 dark:text-emerald-400";
    case "stable":
      return "text-foreground";
    case "watch":
      return "text-amber-700 dark:text-amber-400";
    default: {
      const _exhaustive: never = tone;
      return _exhaustive;
    }
  }
}

export function ReportsBiHealth({ data }: ReportsBiHealthProps) {
  const health = buildBusinessHealthScore(data);

  return (
    <Card className="border-border/50">
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Activity className="h-5 w-5 text-primary" aria-hidden="true" />
          Business health
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Composite score from existing KPIs and analytics tables
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-3">
          <p className={cn("text-4xl font-semibold", toneClass(health.tone))}>
            {health.overall}
          </p>
          <p className="pb-1 text-sm capitalize text-muted-foreground">
            {health.tone} overall
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {health.factors.map((factor) => (
            <div
              key={factor.dimension}
              className="rounded-lg border border-border/50 p-3"
            >
              <p className="text-xs font-medium text-muted-foreground">
                {factor.label}
              </p>
              <p
                className={cn(
                  "mt-1 text-xl font-semibold",
                  toneClass(factor.tone),
                )}
              >
                {factor.score}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {factor.detail}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
