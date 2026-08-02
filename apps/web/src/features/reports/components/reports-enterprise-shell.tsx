"use client";

import type {
  AiInsight,
  AnalyticsDashboard,
  ReportDateRangeValue,
  ReportExportFormatValue,
  ReportTemplate,
  SavedReport,
} from "@enterprise/shared";

import { EmptyState } from "@/components/common/feedback/empty-state";
import { ErrorState } from "@/components/common/feedback/error-state";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { PageHeader } from "@/components/layout/page-header";

import type { ReportsTab } from "../types/reports.types";
import { ReportsAiInsightsPanel } from "./reports-ai-insights-panel";
import { ReportsChartsSectionGate } from "./reports-charts-section-gate";
import {
  ReportsFilters,
  type ReportsAdvancedFilterValues,
} from "./reports-filters";
import { ReportsSaveDialog } from "./reports-save-dialog";
import { ReportsSavedPanel } from "./reports-saved-panel";
import { ReportsAnalyticsSkeleton } from "./reports-skeletons";
import { ReportsTabs } from "./reports-tabs";
import { ReportsToolbar } from "./reports-toolbar";

export interface ReportsShellProps {
  activeTab: ReportsTab;
  onTabChange: (tab: ReportsTab) => void;
  dateRange: ReportDateRangeValue;
  onDateRangeChange: (value: ReportDateRangeValue) => void;
  onOpenFilters: () => void;
  canExport: boolean;
  exportDisabled: boolean;
  isExporting: boolean;
  onExport: (format: ReportExportFormatValue) => void;
  exportError: string | null;
  analyticsData: AnalyticsDashboard | undefined;
  analyticsLoading: boolean;
  analyticsError: boolean;
  analyticsErrorMessage: string | null;
  onAnalyticsRetry: () => void;
  insight: AiInsight | undefined;
  insightsLoading: boolean;
  insightsError: boolean;
  insightsErrorMessage: string | null;
  onInsightsRetry: () => void;
  templates: ReportTemplate[];
  savedReports: SavedReport[];
  savedLoading: boolean;
  savedError: boolean;
  savedErrorMessage: string | null;
  isUpdatingSaved: boolean;
  isDeletingSaved: boolean;
  onSavedRetry: () => void;
  onLoadReport: (report: SavedReport) => void;
  onToggleFavorite: (report: SavedReport) => void;
  onDeleteReport: (report: SavedReport) => void;
  filtersOpen: boolean;
  onFiltersOpenChange: (open: boolean) => void;
  customFrom: string;
  customTo: string;
  onCustomFromChange: (value: string) => void;
  onCustomToChange: (value: string) => void;
  onApplyFilters: () => void;
  saveDialogOpen: boolean;
  onSaveDialogOpenChange: (open: boolean) => void;
  saveName: string;
  saveDescription: string;
  isSavingReport: boolean;
  onSaveNameChange: (value: string) => void;
  onSaveDescriptionChange: (value: string) => void;
  onSaveReport: () => void;
  onOpenSaveDialog: () => void;
  /** Phase 2 flags / controls (defaults keep Phase 1 behavior). */
  enhancedKpis?: boolean;
  trendEnhancements?: boolean;
  insightCards?: boolean;
  businessSummary?: boolean;
  recommendationCards?: boolean;
  activityTimeline?: boolean;
  advancedFilters?: boolean;
  advancedFilterValues?: ReportsAdvancedFilterValues;
  onAdvancedFilterChange?: (values: ReportsAdvancedFilterValues) => void;
  onClearAdvancedFilters?: () => void;
  showRefresh?: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  useSkeletons?: boolean;
}

function ReportsMainBody(props: ReportsShellProps) {
  if (props.activeTab === "saved") {
    return (
      <ReportsSavedPanel
        templates={props.templates}
        savedReports={props.savedReports}
        isLoading={props.savedLoading}
        isError={props.savedError}
        errorMessage={props.savedErrorMessage}
        isUpdating={props.isUpdatingSaved}
        isDeleting={props.isDeletingSaved}
        onRetry={props.onSavedRetry}
        onLoadReport={props.onLoadReport}
        onToggleFavorite={props.onToggleFavorite}
        onDeleteReport={props.onDeleteReport}
      />
    );
  }

  if (props.activeTab === "ai-insights") {
    return (
      <ReportsAiInsightsPanel
        insight={props.insight}
        analyticsData={props.analyticsData}
        isLoading={props.insightsLoading}
        isError={props.insightsError}
        errorMessage={props.insightsErrorMessage}
        onRetry={props.onInsightsRetry}
        useSkeletons={props.useSkeletons}
        insightCards={props.insightCards}
        businessSummary={props.businessSummary}
        recommendationCards={props.recommendationCards}
        activityTimeline={props.activityTimeline}
      />
    );
  }

  if (props.analyticsLoading) {
    return props.useSkeletons ? (
      <ReportsAnalyticsSkeleton />
    ) : (
      <LoadingState label="Loading analytics" />
    );
  }

  if (props.analyticsError) {
    return (
      <ErrorState
        description={
          props.analyticsErrorMessage ?? "Could not load analytics data."
        }
        onRetry={props.onAnalyticsRetry}
      />
    );
  }

  if (props.analyticsData) {
    return (
      <ReportsChartsSectionGate
        tab={props.activeTab}
        data={props.analyticsData}
        enhancedKpis={props.enhancedKpis}
        trendEnhancements={props.trendEnhancements}
      />
    );
  }

  return (
    <EmptyState
      title="No analytics data"
      description="Try adjusting your date range or filters."
    />
  );
}

/** Modular composition path (AI_ANALYTICS_ENTERPRISE_SHELL or Phase 2 flags ON). */
export function ReportsEnterpriseShell(props: ReportsShellProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        description="Explore business performance, export data, and save custom report views."
        actionLabel={props.activeTab !== "saved" ? "Save report" : undefined}
        onAction={
          props.activeTab !== "saved" ? props.onOpenSaveDialog : undefined
        }
      />

      <ReportsToolbar
        dateRange={props.dateRange}
        onDateRangeChange={props.onDateRangeChange}
        onOpenFilters={props.onOpenFilters}
        canExport={props.canExport}
        exportDisabled={props.exportDisabled}
        isExporting={props.isExporting}
        onExport={props.onExport}
        showRefresh={props.showRefresh}
        isRefreshing={props.isRefreshing}
        onRefresh={props.onRefresh}
      />

      {props.exportError ? (
        <p className="text-sm text-destructive" role="alert">
          {props.exportError}
        </p>
      ) : null}

      <ReportsTabs
        activeTab={props.activeTab}
        onTabChange={props.onTabChange}
      />

      <ReportsMainBody {...props} />

      <ReportsFilters
        open={props.filtersOpen}
        onOpenChange={props.onFiltersOpenChange}
        customFrom={props.customFrom}
        customTo={props.customTo}
        onCustomFromChange={props.onCustomFromChange}
        onCustomToChange={props.onCustomToChange}
        onApply={props.onApplyFilters}
        advancedFilters={props.advancedFilters}
        advancedValues={props.advancedFilterValues}
        onAdvancedChange={props.onAdvancedFilterChange}
        onClearAdvanced={props.onClearAdvancedFilters}
      />

      <ReportsSaveDialog
        open={props.saveDialogOpen}
        onOpenChange={props.onSaveDialogOpenChange}
        name={props.saveName}
        description={props.saveDescription}
        isSaving={props.isSavingReport}
        onNameChange={props.onSaveNameChange}
        onDescriptionChange={props.onSaveDescriptionChange}
        onSave={props.onSaveReport}
      />
    </div>
  );
}
