"use client";

import type { AnalyticsDashboard } from "@enterprise/shared";
import { AlertTriangle, Building2, FileWarning } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { formatCurrency } from "../types/reports.types";

export interface ReportsActivityTimelineProps {
  data: AnalyticsDashboard;
  generatedAt?: string;
}

interface TimelineItem {
  id: string;
  icon: "client" | "project" | "invoice";
  title: string;
  detail: string;
}

function buildTimelineItems(data: AnalyticsDashboard): TimelineItem[] {
  const items: TimelineItem[] = [];

  for (const client of data.tables.topClients.slice(0, 3)) {
    items.push({
      id: `client-${client.id}`,
      icon: "client",
      title: `Top client · ${client.name}`,
      detail: `${formatCurrency(client.revenue)} · ${client.invoices} invoices`,
    });
  }

  for (const project of data.tables.atRiskProjects.slice(0, 3)) {
    items.push({
      id: `project-${project.id}`,
      icon: "project",
      title: `At-risk project · ${project.name}`,
      detail: `${project.status} · ${project.progress}% complete`,
    });
  }

  for (const invoice of data.tables.overdueInvoices.slice(0, 3)) {
    items.push({
      id: `invoice-${invoice.id}`,
      icon: "invoice",
      title: `Overdue invoice · ${invoice.number}`,
      detail: `${invoice.clientName} · ${formatCurrency(invoice.total)}`,
    });
  }

  return items;
}

function TimelineIcon({ kind }: { kind: TimelineItem["icon"] }) {
  switch (kind) {
    case "client":
      return <Building2 className="h-4 w-4" aria-hidden="true" />;
    case "project":
      return <AlertTriangle className="h-4 w-4" aria-hidden="true" />;
    case "invoice":
      return <FileWarning className="h-4 w-4" aria-hidden="true" />;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

/** Client-side signal timeline from existing analytics tables only. */
export function ReportsActivityTimeline({
  data,
  generatedAt,
}: ReportsActivityTimelineProps) {
  const items = buildTimelineItems(data);

  if (items.length === 0) return null;

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Activity signals
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Derived from current analytics tables
          {generatedAt
            ? ` · as of ${new Date(generatedAt).toLocaleString()}`
            : ` · ${new Date(data.from).toLocaleDateString()} – ${new Date(data.to).toLocaleDateString()}`}
        </p>
      </CardHeader>
      <CardContent>
        <ol className="relative space-y-4 border-l border-border/60 pl-5">
          {items.map((item) => (
            <li key={item.id} className="relative">
              <span className="absolute -left-[1.55rem] flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-primary">
                <TimelineIcon kind={item.icon} />
              </span>
              <p className="text-sm font-medium text-foreground">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.detail}</p>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
