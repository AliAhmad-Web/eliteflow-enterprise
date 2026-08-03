"use client";

import type { AnalyticsDashboard } from "@enterprise/shared";
import { Building2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { ReportsTab } from "../types/reports.types";
import { buildDepartmentIntelligence } from "../utils/bi-composition";

export interface ReportsBiDepartmentIntelligenceProps {
  data: AnalyticsDashboard;
  tab: Exclude<ReportsTab, "saved" | "ai-insights">;
}

const TAB_TO_IDS: Partial<
  Record<
    Exclude<ReportsTab, "saved" | "ai-insights">,
    Array<"revenue" | "clients" | "projects" | "team" | "invoices">
  >
> = {
  overview: ["revenue", "clients", "projects", "team", "invoices"],
  revenue: ["revenue", "invoices"],
  clients: ["clients"],
  projects: ["projects"],
  tasks: ["projects", "team"],
  team: ["team"],
  invoices: ["invoices"],
};

export function ReportsBiDepartmentIntelligence({
  data,
  tab,
}: ReportsBiDepartmentIntelligenceProps) {
  const cards = buildDepartmentIntelligence(data);
  const allowed = TAB_TO_IDS[tab] ?? ["revenue", "clients", "projects", "team", "invoices"];
  const visible = cards.filter((card) => allowed.includes(card.id));

  if (visible.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-primary" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-foreground">
          Department intelligence
        </h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((card) => (
          <Card key={card.id} className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">{card.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">{card.summary}</p>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {card.metricLabel}
                </p>
                <p className="text-lg font-semibold text-foreground">
                  {card.metricValue}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
