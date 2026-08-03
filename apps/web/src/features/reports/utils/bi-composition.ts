import type {
  AiInsight,
  AnalyticsDashboard,
  ChartPoint,
  KpiCard,
} from "@enterprise/shared";

import { formatKpiValue, formatPercent } from "../types/reports.types";

export type BiInsightCategory =
  | "Revenue"
  | "Clients"
  | "Projects"
  | "Team"
  | "Invoices"
  | "General";

export type BiHealthDimension =
  | "revenue"
  | "projects"
  | "clients"
  | "team"
  | "invoices";

export type BiHealthTone = "strong" | "stable" | "watch";

export interface BiHealthFactor {
  dimension: BiHealthDimension;
  label: string;
  score: number;
  tone: BiHealthTone;
  detail: string;
}

export interface BiHealthScore {
  overall: number;
  tone: BiHealthTone;
  factors: BiHealthFactor[];
}

export interface BiRecommendationGroup {
  category: BiInsightCategory;
  items: string[];
}

export interface BiHistoryRow {
  label: string;
  current: string;
  changeLabel: string;
  trend: KpiCard["trend"];
}

export interface BiDepartmentCard {
  id: BiHealthDimension;
  title: string;
  summary: string;
  metricLabel: string;
  metricValue: string;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function toneFromScore(score: number): BiHealthTone {
  if (score >= 70) return "strong";
  if (score >= 45) return "stable";
  return "watch";
}

function seriesSlope(points: ChartPoint[]): number {
  if (points.length < 2) return 0;
  const first = points[0]!.value;
  const last = points[points.length - 1]!.value;
  if (first === 0) return last === 0 ? 0 : last > 0 ? 1 : -1;
  return (last - first) / Math.abs(first);
}

function findKpi(kpis: KpiCard[], keys: string[]): KpiCard | undefined {
  const lowered = keys.map((k) => k.toLowerCase());
  return kpis.find((kpi) => lowered.includes(kpi.key.toLowerCase()));
}

function scoreFromTrend(
  changePercent: number | undefined,
  trend: KpiCard["trend"],
  invert = false,
): number {
  let base = 55;
  if (typeof changePercent === "number") {
    base = 55 + changePercent * (invert ? -1 : 1);
  } else if (trend === "up") {
    base = invert ? 40 : 70;
  } else if (trend === "down") {
    base = invert ? 70 : 40;
  }
  return clampScore(base);
}

/** Client-side health score from existing dashboard signals only. */
export function buildBusinessHealthScore(
  data: AnalyticsDashboard,
): BiHealthScore {
  const revenueKpi = findKpi(data.kpis, ["revenue", "total_revenue"]);
  const clientKpi = findKpi(data.kpis, ["clients_active", "clients", "active_clients"]);
  const taskKpi = findKpi(data.kpis, ["task_completion", "tasks"]);
  const collectionKpi = findKpi(data.kpis, ["collection_rate", "collections"]);
  const productivityKpi = findKpi(data.kpis, ["productivity", "attendance"]);

  const overdue = data.tables.overdueInvoices.length;
  const atRisk = data.tables.atRiskProjects.length;

  const revenueScore = scoreFromTrend(
    revenueKpi?.changePercent,
    revenueKpi?.trend ?? (seriesSlope(data.revenueTrend) >= 0 ? "up" : "down"),
  );
  const clientScore = scoreFromTrend(
    clientKpi?.changePercent,
    clientKpi?.trend ?? (seriesSlope(data.clientGrowth) >= 0 ? "up" : "down"),
  );
  const projectScore = clampScore(
    75 - atRisk * 12 + (taskKpi?.changePercent ?? 0),
  );
  const teamScore = scoreFromTrend(
    productivityKpi?.changePercent,
    productivityKpi?.trend,
  );
  const invoiceScore = clampScore(
    scoreFromTrend(collectionKpi?.changePercent, collectionKpi?.trend) -
      overdue * 8,
  );

  const factors: BiHealthFactor[] = [
    {
      dimension: "revenue",
      label: "Revenue health",
      score: revenueScore,
      tone: toneFromScore(revenueScore),
      detail: revenueKpi
        ? `${formatKpiValue(revenueKpi)}${
            typeof revenueKpi.changePercent === "number"
              ? ` (${formatPercent(revenueKpi.changePercent)})`
              : ""
          }`
        : `Trend points: ${data.revenueTrend.length}`,
    },
    {
      dimension: "projects",
      label: "Project health",
      score: projectScore,
      tone: toneFromScore(projectScore),
      detail: `${atRisk} at-risk project${atRisk === 1 ? "" : "s"}`,
    },
    {
      dimension: "clients",
      label: "Client health",
      score: clientScore,
      tone: toneFromScore(clientScore),
      detail: clientKpi
        ? formatKpiValue(clientKpi)
        : `${data.tables.topClients.length} top clients`,
    },
    {
      dimension: "team",
      label: "Team health",
      score: teamScore,
      tone: toneFromScore(teamScore),
      detail: productivityKpi
        ? formatKpiValue(productivityKpi)
        : `Productivity series: ${data.employeeProductivity.length}`,
    },
    {
      dimension: "invoices",
      label: "Invoice health",
      score: invoiceScore,
      tone: toneFromScore(invoiceScore),
      detail: `${overdue} overdue invoice${overdue === 1 ? "" : "s"}`,
    },
  ];

  const overall = clampScore(
    factors.reduce((sum, f) => sum + f.score, 0) / factors.length,
  );

  return { overall, tone: toneFromScore(overall), factors };
}

export function categorizeInsightBullet(bullet: string): BiInsightCategory {
  const text = bullet.toLowerCase();
  if (
    /revenue|sales|pipeline|arr|mrr|growth rate|booking/.test(text)
  ) {
    return "Revenue";
  }
  if (/client|customer|account|churn|retention|pipeline lead/.test(text)) {
    return "Clients";
  }
  if (/project|delivery|milestone|deadline|scope|at[- ]?risk/.test(text)) {
    return "Projects";
  }
  if (/team|employee|productivity|attendance|leave|staff|capacity/.test(text)) {
    return "Team";
  }
  if (/invoice|payment|collection|overdue|billing|receivable/.test(text)) {
    return "Invoices";
  }
  return "General";
}

function urgencyScore(bullet: string): number {
  const text = bullet.toLowerCase();
  let score = 0;
  if (/critical|urgent|immediate|overdue|at[- ]?risk|decline|drop/.test(text)) {
    score += 3;
  }
  if (/improve|increase|opportunity|consider|recommend/.test(text)) {
    score += 1;
  }
  if (/stable|maintain|steady/.test(text)) {
    score -= 1;
  }
  return score;
}

/** Group and optionally prioritize insight bullets without changing the DTO. */
export function groupInsightRecommendations(
  bullets: string[],
  prioritize = false,
): BiRecommendationGroup[] {
  const order: BiInsightCategory[] = [
    "Revenue",
    "Clients",
    "Projects",
    "Team",
    "Invoices",
    "General",
  ];
  const map = new Map<BiInsightCategory, string[]>();
  for (const category of order) map.set(category, []);

  const sorted = prioritize
    ? [...bullets].sort((a, b) => urgencyScore(b) - urgencyScore(a))
    : bullets;

  for (const bullet of sorted) {
    const category = categorizeInsightBullet(bullet);
    map.get(category)!.push(bullet);
  }

  return order
    .map((category) => ({
      category,
      items: map.get(category) ?? [],
    }))
    .filter((group) => group.items.length > 0);
}

/** Historical comparison rows from KPI changePercent / trend only. */
export function buildHistoricalComparisonRows(
  kpis: KpiCard[],
): BiHistoryRow[] {
  return kpis
    .filter(
      (kpi) =>
        typeof kpi.changePercent === "number" ||
        kpi.trend === "up" ||
        kpi.trend === "down" ||
        kpi.trend === "flat",
    )
    .slice(0, 6)
    .map((kpi) => ({
      label: kpi.label,
      current: formatKpiValue(kpi),
      changeLabel:
        typeof kpi.changePercent === "number"
          ? formatPercent(kpi.changePercent)
          : kpi.trend === "up"
            ? "Up vs prior"
            : kpi.trend === "down"
              ? "Down vs prior"
              : "Flat vs prior",
      trend: kpi.trend,
    }));
}

export function buildExecutiveKpiHighlights(kpis: KpiCard[]): KpiCard[] {
  const preferred = ["revenue", "clients_active", "task_completion", "collection_rate"];
  const selected: KpiCard[] = [];
  for (const key of preferred) {
    const match = findKpi(kpis, [key]);
    if (match) selected.push(match);
  }
  if (selected.length >= 3) return selected.slice(0, 4);
  return kpis.slice(0, 4);
}

export function buildDepartmentIntelligence(
  data: AnalyticsDashboard,
): BiDepartmentCard[] {
  const revenueKpi = findKpi(data.kpis, ["revenue", "total_revenue"]);
  const clientKpi = findKpi(data.kpis, ["clients_active", "clients"]);
  const collectionKpi = findKpi(data.kpis, ["collection_rate", "collections"]);
  const productivityKpi = findKpi(data.kpis, ["productivity", "attendance"]);

  return [
    {
      id: "revenue",
      title: "Revenue",
      summary:
        data.revenueTrend.length > 0
          ? `Tracking ${data.revenueTrend.length} revenue points in the selected window.`
          : "Revenue series unavailable for this period.",
      metricLabel: revenueKpi?.label ?? "Revenue points",
      metricValue: revenueKpi
        ? formatKpiValue(revenueKpi)
        : String(data.revenueTrend.length),
    },
    {
      id: "clients",
      title: "Clients",
      summary: `${data.tables.topClients.length} top client${
        data.tables.topClients.length === 1 ? "" : "s"
      } highlighted from analytics tables.`,
      metricLabel: clientKpi?.label ?? "Top clients",
      metricValue: clientKpi
        ? formatKpiValue(clientKpi)
        : String(data.tables.topClients.length),
    },
    {
      id: "projects",
      title: "Projects",
      summary: `${data.tables.atRiskProjects.length} project${
        data.tables.atRiskProjects.length === 1 ? "" : "s"
      } flagged at risk.`,
      metricLabel: "At-risk projects",
      metricValue: String(data.tables.atRiskProjects.length),
    },
    {
      id: "team",
      title: "Team",
      summary:
        data.employeeProductivity.length > 0
          ? `Productivity breakdown across ${data.employeeProductivity.length} series points.`
          : "Team productivity series unavailable.",
      metricLabel: productivityKpi?.label ?? "Productivity points",
      metricValue: productivityKpi
        ? formatKpiValue(productivityKpi)
        : String(data.employeeProductivity.length),
    },
    {
      id: "invoices",
      title: "Invoices",
      summary: `${data.tables.overdueInvoices.length} overdue invoice${
        data.tables.overdueInvoices.length === 1 ? "" : "s"
      } in the current dataset.`,
      metricLabel: collectionKpi?.label ?? "Overdue",
      metricValue: collectionKpi
        ? formatKpiValue(collectionKpi)
        : String(data.tables.overdueInvoices.length),
    },
  ];
}

export function buildOperationalOverview(data: AnalyticsDashboard): string {
  const parts = [
    `${data.kpis.length} KPI${data.kpis.length === 1 ? "" : "s"}`,
    `${data.tables.topClients.length} top clients`,
    `${data.tables.atRiskProjects.length} at-risk projects`,
    `${data.tables.overdueInvoices.length} overdue invoices`,
  ];
  return `Operational snapshot for ${data.range.replaceAll("_", " ")}: ${parts.join(" · ")}.`;
}

export function buildExecutiveAiSummary(
  insight: AiInsight | undefined,
  data: AnalyticsDashboard,
): string {
  if (insight?.summary?.trim()) {
    return insight.summary.trim();
  }
  return buildOperationalOverview(data);
}
