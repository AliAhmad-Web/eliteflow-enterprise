"use client";

import type { AiInsight, AnalyticsDashboard } from "@enterprise/shared";
import type { ReactNode } from "react";

import { formatCurrency } from "../types/reports.types";
import type { ReportsTab } from "../types/reports.types";
import { ReportsAnalyticsTables } from "./reports-analytics-tables";
import { ReportsBiDepartmentIntelligence } from "./reports-bi-department-intelligence";
import { ReportsBiExecutiveSummary } from "./reports-bi-executive-summary";
import { ReportsBiHealth } from "./reports-bi-health";
import { ReportsBiHistoryCompare } from "./reports-bi-history-compare";
import { ReportsDataTable } from "./reports-data-table";
import { ReportsKpiSection } from "./reports-kpi-section";
import {
  AreaChart,
  BarChart,
  LineChart,
  PieChart,
} from "./simple-charts";

export interface ReportsChartsSectionProps {
  tab: Exclude<ReportsTab, "saved" | "ai-insights">;
  data: AnalyticsDashboard;
  enhancedKpis?: boolean;
  trendEnhancements?: boolean;
  insight?: AiInsight;
  biExecutiveSummary?: boolean;
  biBusinessHealth?: boolean;
  biDepartmentIntelligence?: boolean;
  biHistoryCompare?: boolean;
  biReportLayout?: boolean;
}

/** Category tab charts + KPI composition (reuses simple-charts). */
export function ReportsChartsSection({
  tab,
  data,
  enhancedKpis = false,
  trendEnhancements = false,
  insight,
  biExecutiveSummary = false,
  biBusinessHealth = false,
  biDepartmentIntelligence = false,
  biHistoryCompare = false,
  biReportLayout = false,
}: ReportsChartsSectionProps) {
  const kpi = (
    <ReportsKpiSection
      kpis={data.kpis}
      enhanced={enhancedKpis}
      dashboard={data}
    />
  );

  const chartTitle = (title: string) =>
    trendEnhancements ? `${title}` : title;

  const core = renderTabCore(tab, data, kpi, chartTitle);

  const showBiLead =
    biExecutiveSummary ||
    biBusinessHealth ||
    biHistoryCompare ||
    biDepartmentIntelligence ||
    biReportLayout;

  if (!showBiLead) {
    return core;
  }

  const lead: ReactNode[] = [];
  if (biExecutiveSummary && (tab === "overview" || biReportLayout)) {
    lead.push(
      <ReportsBiExecutiveSummary
        key="bi-exec"
        data={data}
        insight={insight}
      />,
    );
  }
  if (biBusinessHealth && (tab === "overview" || biReportLayout)) {
    lead.push(<ReportsBiHealth key="bi-health" data={data} />);
  }
  if (biHistoryCompare) {
    lead.push(
      <ReportsBiHistoryCompare key="bi-history" kpis={data.kpis} />,
    );
  }

  const trail =
    biDepartmentIntelligence ? (
      <ReportsBiDepartmentIntelligence key="bi-dept" data={data} tab={tab} />
    ) : null;

  return (
    <div className="space-y-6">
      {lead}
      {core}
      {trail}
    </div>
  );
}

function renderTabCore(
  tab: Exclude<ReportsTab, "saved" | "ai-insights">,
  data: AnalyticsDashboard,
  kpi: ReactNode,
  chartTitle: (title: string) => string,
): ReactNode {
  switch (tab) {
    case "overview":
      return (
        <div className="space-y-6">
          {kpi}
          <div className="grid gap-4 lg:grid-cols-2">
            <AreaChart
              title={chartTitle("Revenue trend")}
              data={data.revenueTrend}
              valueFormatter={(v) => formatCurrency(v)}
            />
            <LineChart
              title={chartTitle("Client growth")}
              data={data.clientGrowth}
              color="var(--chart-2)"
            />
          </div>
          <ReportsAnalyticsTables data={data} />
        </div>
      );
    case "revenue":
      return (
        <div className="space-y-6">
          {kpi}
          <AreaChart
            title={chartTitle("Revenue trend")}
            data={data.revenueTrend}
            valueFormatter={(v) => formatCurrency(v)}
          />
          <BarChart
            title={chartTitle("Invoice status")}
            data={data.invoiceStatus}
            valueFormatter={(v) => v.toLocaleString()}
          />
        </div>
      );
    case "clients":
      return (
        <div className="space-y-6">
          {kpi}
          <LineChart
            title={chartTitle("Client growth")}
            data={data.clientGrowth}
            color="var(--chart-2)"
          />
          <ReportsDataTable
            title="Top clients"
            headers={["Client", "Revenue", "Invoices"]}
            emptyMessage="No client data available."
            rows={data.tables.topClients.map((client) => [
              client.name,
              formatCurrency(client.revenue),
              client.invoices.toLocaleString(),
            ])}
          />
        </div>
      );
    case "projects":
      return (
        <div className="space-y-6">
          {kpi}
          <PieChart title={chartTitle("Project status")} data={data.projectStatus} />
          <ReportsDataTable
            title="At-risk projects"
            headers={["Project", "Status", "Progress", "Due"]}
            emptyMessage="No at-risk projects found."
            rows={data.tables.atRiskProjects.map((project) => [
              project.name,
              project.status,
              `${project.progress}%`,
              project.dueDate
                ? new Date(project.dueDate).toLocaleDateString()
                : "—",
            ])}
          />
        </div>
      );
    case "tasks":
      return (
        <div className="space-y-6">
          {kpi}
          <BarChart title={chartTitle("Task status")} data={data.taskStatus} />
        </div>
      );
    case "team":
      return (
        <div className="space-y-6">
          {kpi}
          <div className="grid gap-4 lg:grid-cols-2">
            <BarChart
              title={chartTitle("Employee productivity")}
              data={data.employeeProductivity}
            />
            <PieChart
              title={chartTitle("Attendance breakdown")}
              data={data.attendanceBreakdown}
            />
          </div>
          <BarChart
            title={chartTitle("Leave breakdown")}
            data={data.leaveBreakdown}
          />
        </div>
      );
    case "invoices":
      return (
        <div className="space-y-6">
          {kpi}
          <BarChart
            title={chartTitle("Invoice status")}
            data={data.invoiceStatus}
          />
          <ReportsDataTable
            title="Overdue invoices"
            headers={["Invoice", "Client", "Total", "Due"]}
            emptyMessage="No overdue invoices."
            rows={data.tables.overdueInvoices.map((invoice) => [
              invoice.number,
              invoice.clientName,
              formatCurrency(invoice.total),
              invoice.dueDate
                ? new Date(invoice.dueDate).toLocaleDateString()
                : "—",
            ])}
          />
        </div>
      );
    default: {
      const _exhaustive: never = tab;
      return _exhaustive;
    }
  }
}
