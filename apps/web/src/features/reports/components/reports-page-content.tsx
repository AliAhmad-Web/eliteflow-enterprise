"use client";

import {
  PERMISSIONS,
  REPORT_DATE_RANGES,
  REPORT_EXPORT_FORMATS,
  type AnalyticsDashboard,
  type AnalyticsQueryInput,
  type KpiCard,
  type ReportDateRangeValue,
  type ReportExportFormatValue,
  type SavedReport,
} from "@enterprise/shared";
import {
  Bookmark,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  Sparkles,
  Star,
  Trash2,
  TrendingUp,
} from "lucide-react";
import {
  useDeferredValue,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { MetricTrend } from "@/components/common/display/metric-trend";
import { EmptyState } from "@/components/common/feedback/empty-state";
import { ErrorState } from "@/components/common/feedback/error-state";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useHasPermission } from "@/features/rbac/hooks/use-permissions";
import { ApiClientError } from "@/services/api/api-error";
import { cn } from "@/lib/utils";

import {
  useCreateSavedReport,
  useDeleteSavedReport,
  useExportReport,
  useUpdateSavedReport,
} from "../hooks/use-reports-mutations";
import {
  useAiInsights,
  useAnalytics,
  useReportTemplates,
  useSavedReports,
} from "../hooks/use-reports";
import {
  REPORT_DATE_RANGE_LABELS,
  REPORTS_TAB_LABELS,
  REPORTS_TAB_TO_CATEGORY,
  datetimeLocalToIso,
  formatCurrency,
  formatKpiValue,
  isoToDatetimeLocal,
  type ReportsTab,
} from "../types/reports.types";
import {
  AreaChart,
  BarChart,
  LineChart,
  PieChart,
} from "./simple-charts";

const selectClassName =
  "flex h-10 w-full rounded-lg border border-input bg-background/80 px-3 py-2 text-sm text-foreground shadow-[var(--shadow-xs)] transition-all focus-visible:outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring/50";

const EXPORT_LABELS: Record<ReportExportFormatValue, string> = {
  CSV: "CSV",
  EXCEL: "Excel",
  PDF: "PDF",
  PRINT: "Print",
};

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function mapTrend(trend: KpiCard["trend"]) {
  if (trend === "flat") return "neutral" as const;
  if (trend === "up" || trend === "down") return trend;
  return "neutral" as const;
}

function KpiGrid({ kpis }: { kpis: KpiCard[] }) {
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
      {kpis.map((kpi) => (
        <Card key={kpi.key} className="border-border/50">
          <CardContent className="space-y-3 p-4 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  {kpi.label}
                </p>
                <p className="text-2xl font-bold tracking-tight text-foreground">
                  {formatKpiValue(kpi)}
                </p>
                {kpi.changePercent != null && kpi.trend ? (
                  <MetricTrend
                    value={kpi.changePercent}
                    trend={mapTrend(kpi.trend)}
                  />
                ) : null}
              </div>
              <div className="icon-box icon-box-md rounded-xl bg-primary/10">
                <TrendingUp
                  className="h-5 w-5 text-primary"
                  aria-hidden="true"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function DataTable({
  title,
  headers,
  rows,
  emptyMessage,
}: {
  title: string;
  headers: string[];
  rows: ReactNode[][];
  emptyMessage: string;
}) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  {headers.map((header) => (
                    <th key={header} className="px-3 py-2 font-medium">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((cells, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className="border-b border-border/50 last:border-0"
                  >
                    {cells.map((cell, cellIndex) => (
                      <td key={cellIndex} className="px-3 py-2.5">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AnalyticsTables({ data }: { data: AnalyticsDashboard }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      <DataTable
        title="Top clients"
        headers={["Client", "Revenue", "Invoices"]}
        emptyMessage="No client revenue data for this period."
        rows={data.tables.topClients.map((client) => [
          client.name,
          formatCurrency(client.revenue),
          client.invoices.toLocaleString(),
        ])}
      />
      <DataTable
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
      <DataTable
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
}

function OverviewPanel({ data }: { data: AnalyticsDashboard }) {
  return (
    <div className="space-y-6">
      <KpiGrid kpis={data.kpis} />
      <div className="grid gap-4 lg:grid-cols-2">
        <AreaChart
          title="Revenue trend"
          data={data.revenueTrend}
          valueFormatter={(v) => formatCurrency(v)}
        />
        <LineChart
          title="Client growth"
          data={data.clientGrowth}
          color="var(--chart-2)"
        />
      </div>
      <AnalyticsTables data={data} />
    </div>
  );
}

function RevenuePanel({ data }: { data: AnalyticsDashboard }) {
  return (
    <div className="space-y-6">
      <KpiGrid kpis={data.kpis} />
      <AreaChart
        title="Revenue trend"
        data={data.revenueTrend}
        valueFormatter={(v) => formatCurrency(v)}
      />
      <BarChart
        title="Invoice status"
        data={data.invoiceStatus}
        valueFormatter={(v) => v.toLocaleString()}
      />
    </div>
  );
}

function ClientsPanel({ data }: { data: AnalyticsDashboard }) {
  return (
    <div className="space-y-6">
      <KpiGrid kpis={data.kpis} />
      <LineChart
        title="Client growth"
        data={data.clientGrowth}
        color="var(--chart-2)"
      />
      <DataTable
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
}

function ProjectsPanel({ data }: { data: AnalyticsDashboard }) {
  return (
    <div className="space-y-6">
      <KpiGrid kpis={data.kpis} />
      <PieChart title="Project status" data={data.projectStatus} />
      <DataTable
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
}

function TasksPanel({ data }: { data: AnalyticsDashboard }) {
  return (
    <div className="space-y-6">
      <KpiGrid kpis={data.kpis} />
      <BarChart title="Task status" data={data.taskStatus} />
    </div>
  );
}

function TeamPanel({ data }: { data: AnalyticsDashboard }) {
  return (
    <div className="space-y-6">
      <KpiGrid kpis={data.kpis} />
      <div className="grid gap-4 lg:grid-cols-2">
        <BarChart
          title="Employee productivity"
          data={data.employeeProductivity}
        />
        <PieChart title="Attendance breakdown" data={data.attendanceBreakdown} />
      </div>
      <BarChart title="Leave breakdown" data={data.leaveBreakdown} />
    </div>
  );
}

function InvoicesPanel({ data }: { data: AnalyticsDashboard }) {
  return (
    <div className="space-y-6">
      <KpiGrid kpis={data.kpis} />
      <BarChart title="Invoice status" data={data.invoiceStatus} />
      <DataTable
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
}

function AiInsightsPanel({
  query,
  enabled,
}: {
  query: AnalyticsQueryInput;
  enabled: boolean;
}) {
  const insightsQuery = useAiInsights(query, enabled);

  if (insightsQuery.isLoading) {
    return <LoadingState label="Generating AI insights" />;
  }

  if (insightsQuery.isError) {
    return (
      <ErrorState
        description={
          insightsQuery.error instanceof ApiClientError
            ? insightsQuery.error.message
            : "Could not load AI insights."
        }
        onRetry={() => insightsQuery.refetch()}
      />
    );
  }

  const insight = insightsQuery.data;
  if (!insight) {
    return (
      <EmptyState
        icon={Sparkles}
        title="No insights yet"
        description="AI insights will appear here once analytics data is available."
      />
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
          AI Insights
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
        {insight.bullets.length > 0 ? (
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            {insight.bullets.map((bullet, index) => (
              <li key={index}>{bullet}</li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SavedReportsPanel({
  onLoadReport,
}: {
  onLoadReport: (report: SavedReport) => void;
}) {
  const savedQuery = useSavedReports();
  const templatesQuery = useReportTemplates();
  const updateMutation = useUpdateSavedReport();
  const deleteMutation = useDeleteSavedReport();

  if (savedQuery.isLoading) {
    return <LoadingState label="Loading saved reports" />;
  }

  if (savedQuery.isError) {
    return (
      <ErrorState
        description={
          savedQuery.error instanceof ApiClientError
            ? savedQuery.error.message
            : "Could not load saved reports."
        }
        onRetry={() => savedQuery.refetch()}
      />
    );
  }

  const items = savedQuery.data?.items ?? [];
  const favorites = items.filter((item) => item.isFavorite);
  const others = items.filter((item) => !item.isFavorite);

  const renderReport = (report: SavedReport) => (
    <Card key={report.id} className="border-border/50">
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground">{report.name}</h3>
            {report.isFavorite ? (
              <Star
                className="h-4 w-4 fill-primary text-primary"
                aria-label="Favorite"
              />
            ) : null}
          </div>
          {report.description ? (
            <p className="text-sm text-muted-foreground">{report.description}</p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            {report.category.replaceAll("_", " ")} · Updated{" "}
            {new Date(report.updatedAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onLoadReport(report)}
          >
            Load
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              updateMutation.mutate({
                id: report.id,
                input: { isFavorite: !report.isFavorite },
              })
            }
            disabled={updateMutation.isPending}
          >
            {report.isFavorite ? "Unfavorite" : "Favorite"}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => deleteMutation.mutate(report.id)}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {templatesQuery.data?.items?.length ? (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Report templates
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 lg:grid-cols-2">
            {templatesQuery.data.items.map((template) => (
              <div
                key={template.id}
                className="rounded-lg border border-border/50 p-3"
              >
                <p className="font-medium text-foreground">{template.name}</p>
                {template.description ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {template.description}
                  </p>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {items.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="No saved reports"
          description="Save your current filters and category to revisit them later."
        />
      ) : (
        <>
          {favorites.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                Favorites
              </h3>
              {favorites.map(renderReport)}
            </div>
          ) : null}
          {others.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                All saved reports
              </h3>
              {others.map(renderReport)}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

export function ReportsPageContent() {
  const canRead = useHasPermission(PERMISSIONS.REPORTS_READ);
  const canExport = useHasPermission(PERMISSIONS.REPORTS_EXPORT);

  const [activeTab, setActiveTab] = useState<ReportsTab>("overview");
  const [dateRange, setDateRange] = useState<ReportDateRangeValue>("this_month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveDescription, setSaveDescription] = useState("");
  const [exportError, setExportError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const deferredRange = useDeferredValue(dateRange);
  const deferredFrom = useDeferredValue(customFrom);
  const deferredTo = useDeferredValue(customTo);

  const analyticsQuery = useMemo<AnalyticsQueryInput>(() => {
    const category =
      activeTab === "saved"
        ? "OVERVIEW"
        : REPORTS_TAB_TO_CATEGORY[activeTab];

    const query: AnalyticsQueryInput = {
      range: deferredRange,
      category,
    };

    if (deferredRange === "custom") {
      const from = datetimeLocalToIso(deferredFrom);
      const to = datetimeLocalToIso(deferredTo);
      if (from) query.from = from;
      if (to) query.to = to;
    }

    return query;
  }, [activeTab, deferredRange, deferredFrom, deferredTo]);

  const analyticsEnabled = canRead && activeTab !== "saved" && activeTab !== "ai-insights";
  const analyticsQueryResult = useAnalytics(analyticsQuery, analyticsEnabled);
  const exportMutation = useExportReport();
  const createSavedMutation = useCreateSavedReport();

  const handleExport = async (format: ReportExportFormatValue) => {
    setExportError(null);
    try {
      await exportMutation.mutateAsync({ ...analyticsQuery, format });
    } catch (error) {
      setExportError(
        error instanceof ApiClientError
          ? error.message
          : "Export failed. Please try again.",
      );
    }
  };

  const handleLoadSavedReport = (report: SavedReport) => {
    const filters = report.filters as Partial<AnalyticsQueryInput>;
    const tabEntry = Object.entries(REPORTS_TAB_TO_CATEGORY).find(
      ([, category]) => category === report.category,
    );
    if (tabEntry) {
      setActiveTab(tabEntry[0] as ReportsTab);
    }
    if (filters.range) {
      setDateRange(filters.range);
    }
    setCustomFrom(isoToDatetimeLocal(filters.from));
    setCustomTo(isoToDatetimeLocal(filters.to));
    setFiltersOpen(false);
  };

  const handleSaveReport = async () => {
    if (!saveName.trim()) return;

    const category =
      activeTab === "saved" || activeTab === "ai-insights"
        ? "OVERVIEW"
        : REPORTS_TAB_TO_CATEGORY[activeTab];

    await createSavedMutation.mutateAsync({
      name: saveName.trim(),
      description: saveDescription.trim() || null,
      category,
      visibility: "PRIVATE",
      isFavorite: false,
      filters: analyticsQuery,
    });

    setSaveDialogOpen(false);
    setSaveName("");
    setSaveDescription("");
  };

  if (!canRead) {
    return (
      <EmptyState
        title="Reports unavailable"
        description="You do not have permission to view reports."
      />
    );
  }

  const tabs = Object.keys(REPORTS_TAB_LABELS) as ReportsTab[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        description="Explore business performance, export data, and save custom report views."
        actionLabel={activeTab !== "saved" ? "Save report" : undefined}
        onAction={
          activeTab !== "saved" ? () => setSaveDialogOpen(true) : undefined
        }
      />

      <div className="flex flex-col gap-4 rounded-xl border border-border/50 bg-card/50 p-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:max-w-xl">
          <div className="space-y-2">
            <Label htmlFor="report-date-range">Date range</Label>
            <select
              id="report-date-range"
              className={selectClassName}
              value={dateRange}
              onChange={(event) =>
                setDateRange(event.target.value as ReportDateRangeValue)
              }
            >
              {REPORT_DATE_RANGES.map((range) => (
                <option key={range} value={range}>
                  {REPORT_DATE_RANGE_LABELS[range]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setFiltersOpen(true)}
            >
              {dateRange === "custom" ? "Custom dates" : "More filters"}
            </Button>
          </div>
        </div>

        {canExport ? (
          <div className="flex flex-wrap gap-2">
            {REPORT_EXPORT_FORMATS.map((format) => (
              <Button
                key={format}
                variant="secondary"
                size="sm"
                disabled={exportMutation.isPending || activeTab === "saved"}
                onClick={() => handleExport(format)}
              >
                {format === "CSV" ? (
                  <Download className="h-4 w-4" aria-hidden="true" />
                ) : format === "EXCEL" ? (
                  <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
                ) : format === "PDF" ? (
                  <FileText className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Printer className="h-4 w-4" aria-hidden="true" />
                )}
                {EXPORT_LABELS[format]}
              </Button>
            ))}
          </div>
        ) : null}
      </div>

      {exportError ? (
        <p className="text-sm text-destructive" role="alert">
          {exportError}
        </p>
      ) : null}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <TabButton
            key={tab}
            active={activeTab === tab}
            onClick={() => setActiveTab(tab)}
          >
            {REPORTS_TAB_LABELS[tab]}
          </TabButton>
        ))}
      </div>

      {activeTab === "saved" ? (
        <SavedReportsPanel onLoadReport={handleLoadSavedReport} />
      ) : activeTab === "ai-insights" ? (
        <AiInsightsPanel query={analyticsQuery} enabled={canRead} />
      ) : analyticsQueryResult.isLoading ? (
        <LoadingState label="Loading analytics" />
      ) : analyticsQueryResult.isError ? (
        <ErrorState
          description={
            analyticsQueryResult.error instanceof ApiClientError
              ? analyticsQueryResult.error.message
              : "Could not load analytics data."
          }
          onRetry={() => analyticsQueryResult.refetch()}
        />
      ) : analyticsQueryResult.data ? (
        <>
          {activeTab === "overview" ? (
            <OverviewPanel data={analyticsQueryResult.data} />
          ) : null}
          {activeTab === "revenue" ? (
            <RevenuePanel data={analyticsQueryResult.data} />
          ) : null}
          {activeTab === "clients" ? (
            <ClientsPanel data={analyticsQueryResult.data} />
          ) : null}
          {activeTab === "projects" ? (
            <ProjectsPanel data={analyticsQueryResult.data} />
          ) : null}
          {activeTab === "tasks" ? (
            <TasksPanel data={analyticsQueryResult.data} />
          ) : null}
          {activeTab === "team" ? (
            <TeamPanel data={analyticsQueryResult.data} />
          ) : null}
          {activeTab === "invoices" ? (
            <InvoicesPanel data={analyticsQueryResult.data} />
          ) : null}
        </>
      ) : (
        <EmptyState
          title="No analytics data"
          description="Try adjusting your date range or filters."
        />
      )}

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Report filters</SheetTitle>
            <p className="text-sm text-muted-foreground">
              Narrow analytics by custom date range.
            </p>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="custom-from">From</Label>
              <Input
                id="custom-from"
                type="datetime-local"
                value={customFrom}
                onChange={(event) => {
                  setCustomFrom(event.target.value);
                  setDateRange("custom");
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom-to">To</Label>
              <Input
                id="custom-to"
                type="datetime-local"
                value={customTo}
                onChange={(event) => {
                  setCustomTo(event.target.value);
                  setDateRange("custom");
                }}
              />
            </div>
            <Button className="w-full" onClick={() => setFiltersOpen(false)}>
              Apply filters
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save report</DialogTitle>
            <DialogDescription>
              Save the current category and filters for quick access later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="save-report-name">Name</Label>
              <Input
                id="save-report-name"
                value={saveName}
                onChange={(event) => setSaveName(event.target.value)}
                placeholder="Monthly revenue overview"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="save-report-description">Description</Label>
              <Input
                id="save-report-description"
                value={saveDescription}
                onChange={(event) => setSaveDescription(event.target.value)}
                placeholder="Optional description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveReport}
              disabled={!saveName.trim() || createSavedMutation.isPending}
            >
              Save report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
