import type {
  AnalyticsQueryInput,
  KpiCard,
  ReportCategoryValue,
  ReportDateRangeValue,
} from "@enterprise/shared";

import { formatMoney } from "@/lib/format-money";

export const REPORTS_QUERY_KEYS = {
  all: ["reports"] as const,
  analytics: () => [...REPORTS_QUERY_KEYS.all, "analytics"] as const,
  analyticsQuery: (query: AnalyticsQueryInput) =>
    [...REPORTS_QUERY_KEYS.analytics(), query] as const,
  insights: () => [...REPORTS_QUERY_KEYS.all, "insights"] as const,
  insightsQuery: (query: AnalyticsQueryInput) =>
    [...REPORTS_QUERY_KEYS.insights(), query] as const,
  templates: () => [...REPORTS_QUERY_KEYS.all, "templates"] as const,
  saved: () => [...REPORTS_QUERY_KEYS.all, "saved"] as const,
};

export type ReportsTab =
  | "overview"
  | "revenue"
  | "clients"
  | "projects"
  | "tasks"
  | "team"
  | "invoices"
  | "ai-insights"
  | "saved";

export const REPORTS_TAB_LABELS: Record<ReportsTab, string> = {
  overview: "Overview",
  revenue: "Revenue",
  clients: "Clients",
  projects: "Projects",
  tasks: "Tasks",
  team: "Team",
  invoices: "Invoices",
  "ai-insights": "AI Insights",
  saved: "Saved",
};

export const REPORTS_TAB_TO_CATEGORY: Record<
  Exclude<ReportsTab, "saved">,
  ReportCategoryValue
> = {
  overview: "OVERVIEW",
  revenue: "REVENUE",
  clients: "CLIENTS",
  projects: "PROJECTS",
  tasks: "TASKS",
  team: "TEAM_PERFORMANCE",
  invoices: "INVOICES",
  "ai-insights": "AI_INSIGHTS",
};

export const REPORT_CATEGORY_LABELS: Record<ReportCategoryValue, string> = {
  OVERVIEW: "Overview",
  REVENUE: "Revenue",
  CLIENTS: "Clients",
  PROJECTS: "Projects",
  TASKS: "Tasks",
  EMPLOYEES: "Employees",
  ATTENDANCE: "Attendance",
  LEAVES: "Leaves",
  INVOICES: "Invoices",
  TEAM_PERFORMANCE: "Team Performance",
  AI_INSIGHTS: "AI Insights",
};

export const REPORT_DATE_RANGE_LABELS: Record<ReportDateRangeValue, string> = {
  today: "Today",
  this_week: "This week",
  this_month: "This month",
  this_quarter: "This quarter",
  this_year: "This year",
  custom: "Custom range",
};

export function formatCurrency(
  value: number,
  options?: Intl.NumberFormatOptions,
): string {
  void options;
  return formatMoney(value);
}

export function formatPercent(value: number): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function formatKpiValue(kpi: KpiCard): string {
  if (typeof kpi.value === "string") {
    return kpi.value;
  }

  switch (kpi.format) {
    case "currency":
      return formatCurrency(kpi.value);
    case "percent":
      return `${kpi.value}%`;
    case "number":
      return kpi.value.toLocaleString();
    case "text":
      return String(kpi.value);
    default:
      return kpi.value.toLocaleString();
  }
}

export function datetimeLocalToIso(value: string): string | undefined {
  if (!value.trim()) {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
}

export function isoToDatetimeLocal(value: string | undefined): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
