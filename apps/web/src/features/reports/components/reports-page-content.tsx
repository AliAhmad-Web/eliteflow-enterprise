"use client";

import {
  PERMISSIONS,
  type AnalyticsQueryInput,
  type ReportDateRangeValue,
  type ReportExportFormatValue,
  type ReportTemplate,
  type SavedReport,
} from "@enterprise/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useDeferredValue, useMemo, useState } from "react";

import { EmptyState } from "@/components/common/feedback/empty-state";
import { AiUiToastViewport, useAiUiToasts } from "@/features/ai/components/ai-ui-toast";
import {
  createMemoizedSelector,
  useAdvancedPerformanceProfiler,
  usePerformanceMemo,
  usePerformanceStableCallback,
  useRenderProfiler,
} from "@/features/performance";
import { useHasPermission } from "@/features/rbac/hooks/use-permissions";
import { ApiClientError } from "@/services/api/api-error";


import {
  isAiAnalyticsActivityTimelineEnabled,
  isAiAnalyticsAdvancedFiltersEnabled,
  isAiAnalyticsBusinessSummaryEnabled,
  isAiAnalyticsEnhancedFeedbackEnabled,
  isAiAnalyticsEnhancedKpisEnabled,
  isAiAnalyticsEnterpriseShellEnabled,
  isAiAnalyticsInsightCardsEnabled,
  isAiAnalyticsRecommendationCardsEnabled,
  isAiAnalyticsRefreshEnabled,
  isAiAnalyticsSkeletonsEnabled,
  isAiAnalyticsTrendEnhancementsEnabled,
  isAiBiBusinessHealthEnabled,
  isAiBiDepartmentIntelligenceEnabled,
  isAiBiExecutiveSummaryEnabled,
  isAiBiExportExperienceEnabled,
  isAiBiHistoryCompareEnabled,
  isAiBiPresentationEnabled,
  isAiBiRecommendationsEnabled,
  isAiBiReportLayoutEnabled,
  isAiBiSavedReportsEnabled,
} from "../feature-flags";
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
import { reportsService } from "../services/reports.service";
import {
  REPORTS_QUERY_KEYS,
  REPORTS_TAB_TO_CATEGORY,
  datetimeLocalToIso,
  isoToDatetimeLocal,
  type ReportsTab,
} from "../types/reports.types";
import type { ReportsShellProps } from "./reports-enterprise-shell";
import { ReportsEnterpriseShell } from "./reports-enterprise-shell";
import type { ReportsAdvancedFilterValues } from "./reports-filters";
import { ReportsLegacyLayout } from "./reports-legacy-layout";

const EMPTY_ADVANCED: ReportsAdvancedFilterValues = {
  clientId: "",
  projectId: "",
  teamId: "",
  invoiceStatus: "",
  taskStatus: "",
};

const EMPTY_TEMPLATES: ReportTemplate[] = [];
const EMPTY_SAVED_REPORTS: SavedReport[] = [];

const selectTemplatesOrEmpty = createMemoizedSelector(
  (items: ReportTemplate[] | undefined): ReportTemplate[] =>
    items ?? EMPTY_TEMPLATES,
);

const selectSavedReportsOrEmpty = createMemoizedSelector(
  (items: SavedReport[] | undefined): SavedReport[] =>
    items ?? EMPTY_SAVED_REPORTS,
);

/**
 * Reports & Analytics orchestration layer.
 * Phase 2 UX enhancements are opt-in via AI_ANALYTICS_* flags (default OFF).
 */
export function ReportsPageContent() {
  useRenderProfiler("ReportsPageContent");
  useAdvancedPerformanceProfiler("ReportsPageContent");

  const queryClient = useQueryClient();
  const canRead = useHasPermission(PERMISSIONS.REPORTS_READ);
  const canExport = useHasPermission(PERMISSIONS.REPORTS_EXPORT);

  const enterpriseShell = isAiAnalyticsEnterpriseShellEnabled();
  const enhancedKpis = isAiAnalyticsEnhancedKpisEnabled();
  const insightCards = isAiAnalyticsInsightCardsEnabled();
  const businessSummary = isAiAnalyticsBusinessSummaryEnabled();
  const trendEnhancements = isAiAnalyticsTrendEnhancementsEnabled();
  const recommendationCards = isAiAnalyticsRecommendationCardsEnabled();
  const activityTimeline = isAiAnalyticsActivityTimelineEnabled();
  const advancedFilters = isAiAnalyticsAdvancedFiltersEnabled();
  const refreshEnabled = isAiAnalyticsRefreshEnabled();
  const skeletons = isAiAnalyticsSkeletonsEnabled();
  const enhancedFeedback = isAiAnalyticsEnhancedFeedbackEnabled();

  const biExecutiveSummary = isAiBiExecutiveSummaryEnabled();
  const biBusinessHealth = isAiBiBusinessHealthEnabled();
  const biDepartmentIntelligence = isAiBiDepartmentIntelligenceEnabled();
  const biRecommendations = isAiBiRecommendationsEnabled();
  const biHistoryCompare = isAiBiHistoryCompareEnabled();
  const biReportLayout = isAiBiReportLayoutEnabled();
  const biSavedReports = isAiBiSavedReportsEnabled();
  const biExportExperience = isAiBiExportExperienceEnabled();
  const biPresentation = isAiBiPresentationEnabled();

  const useModularShell =
    enterpriseShell ||
    enhancedKpis ||
    insightCards ||
    businessSummary ||
    trendEnhancements ||
    recommendationCards ||
    activityTimeline ||
    advancedFilters ||
    refreshEnabled ||
    skeletons ||
    enhancedFeedback ||
    biPresentation;

  const { toasts, pushToast, dismiss } = useAiUiToasts();

  const [activeTab, setActiveTab] = useState<ReportsTab>("overview");
  const [dateRange, setDateRange] =
    useState<ReportDateRangeValue>("this_month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [advancedFilterValues, setAdvancedFilterValues] =
    useState<ReportsAdvancedFilterValues>(EMPTY_ADVANCED);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveDescription, setSaveDescription] = useState("");
  const [exportError, setExportError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const deferredRange = useDeferredValue(dateRange);
  const deferredFrom = useDeferredValue(customFrom);
  const deferredTo = useDeferredValue(customTo);
  const deferredAdvanced = useDeferredValue(advancedFilterValues);

  const analyticsQuery = useMemo<AnalyticsQueryInput>(() => {
    const category =
      activeTab === "saved" ? "OVERVIEW" : REPORTS_TAB_TO_CATEGORY[activeTab];

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

    if (advancedFilters) {
      if (deferredAdvanced.clientId) query.clientId = deferredAdvanced.clientId;
      if (deferredAdvanced.projectId)
        query.projectId = deferredAdvanced.projectId;
      if (deferredAdvanced.teamId) query.teamId = deferredAdvanced.teamId;
      if (deferredAdvanced.invoiceStatus)
        query.invoiceStatus = deferredAdvanced.invoiceStatus;
      if (deferredAdvanced.taskStatus)
        query.taskStatus = deferredAdvanced.taskStatus;
    }

    return query;
  }, [
    activeTab,
    advancedFilters,
    deferredAdvanced,
    deferredFrom,
    deferredRange,
    deferredTo,
  ]);

  const needsAnalyticsOnInsights =
    activeTab === "ai-insights" &&
    (businessSummary || activityTimeline || biHistoryCompare);

  const analyticsEnabled =
    canRead &&
    ((activeTab !== "saved" && activeTab !== "ai-insights") ||
      needsAnalyticsOnInsights);
  const insightsEnabled =
    canRead &&
    (activeTab === "ai-insights" ||
      (biExecutiveSummary && activeTab !== "saved"));
  const savedEnabled = canRead && activeTab === "saved";

  const analyticsQueryResult = useAnalytics(analyticsQuery, analyticsEnabled);
  const insightsQueryResult = useAiInsights(analyticsQuery, insightsEnabled);
  const savedQueryResult = useSavedReports(savedEnabled);
  const templatesQueryResult = useReportTemplates(savedEnabled);

  const exportMutation = useExportReport();
  const createSavedMutation = useCreateSavedReport();
  const updateSavedMutation = useUpdateSavedReport();
  const deleteSavedMutation = useDeleteSavedReport();

  const handleExport = async (format: ReportExportFormatValue) => {
    setExportError(null);
    try {
      await exportMutation.mutateAsync({ ...analyticsQuery, format });
      if (enhancedFeedback) pushToast("Export complete", "success");
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : "Export failed. Please try again.";
      setExportError(message);
      if (enhancedFeedback) pushToast(message, "error");
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: REPORTS_QUERY_KEYS.analytics(),
        }),
        queryClient.fetchQuery({
          queryKey: REPORTS_QUERY_KEYS.insightsQuery(analyticsQuery),
          queryFn: () => reportsService.getInsights(analyticsQuery),
        }),
        analyticsQueryResult.refetch(),
      ]);
      if (enhancedFeedback) pushToast("Analytics refreshed", "success");
    } catch (error) {
      if (enhancedFeedback) {
        pushToast(
          error instanceof Error ? error.message : "Refresh failed",
          "error",
        );
      }
    } finally {
      setIsRefreshing(false);
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
    if (advancedFilters) {
      setAdvancedFilterValues({
        clientId: filters.clientId ?? "",
        projectId: filters.projectId ?? "",
        teamId: filters.teamId ?? "",
        invoiceStatus: filters.invoiceStatus ?? "",
        taskStatus: filters.taskStatus ?? "",
      });
    }
    setFiltersOpen(false);
  };

  const handleSaveReport = async () => {
    if (!saveName.trim()) return;

    const category =
      activeTab === "saved" || activeTab === "ai-insights"
        ? "OVERVIEW"
        : REPORTS_TAB_TO_CATEGORY[activeTab];

    try {
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
      if (enhancedFeedback) pushToast("Report saved", "success");
    } catch (error) {
      if (enhancedFeedback) {
        pushToast(
          error instanceof Error ? error.message : "Save failed",
          "error",
        );
      }
    }
  };

  const onTabChange = usePerformanceStableCallback((tab: ReportsTab) => {
    setActiveTab(tab);
  });
  const onDateRangeChange = usePerformanceStableCallback(
    (value: ReportDateRangeValue) => {
      setDateRange(value);
    },
  );
  const onOpenFilters = usePerformanceStableCallback(() => {
    setFiltersOpen(true);
  });
  const onExport = usePerformanceStableCallback(
    (format: ReportExportFormatValue) => {
      void handleExport(format);
    },
  );
  const onAnalyticsRetry = usePerformanceStableCallback(() => {
    void analyticsQueryResult.refetch();
  });
  const onInsightsRetry = usePerformanceStableCallback(() => {
    void insightsQueryResult.refetch();
  });
  const onSavedRetry = usePerformanceStableCallback(() => {
    void savedQueryResult.refetch();
  });
  const onLoadReport = usePerformanceStableCallback((report: SavedReport) => {
    handleLoadSavedReport(report);
  });
  const onToggleFavorite = usePerformanceStableCallback(
    (report: SavedReport) => {
      updateSavedMutation.mutate({
        id: report.id,
        input: { isFavorite: !report.isFavorite },
      });
    },
  );
  const onDeleteReport = usePerformanceStableCallback((report: SavedReport) => {
    deleteSavedMutation.mutate(report.id);
  });
  const onFiltersOpenChange = usePerformanceStableCallback((open: boolean) => {
    setFiltersOpen(open);
  });
  const onCustomFromChange = usePerformanceStableCallback((value: string) => {
    setCustomFrom(value);
    setDateRange("custom");
  });
  const onCustomToChange = usePerformanceStableCallback((value: string) => {
    setCustomTo(value);
    setDateRange("custom");
  });
  const onApplyFilters = usePerformanceStableCallback(() => {
    setFiltersOpen(false);
  });
  const onSaveDialogOpenChange = usePerformanceStableCallback(
    (open: boolean) => {
      setSaveDialogOpen(open);
    },
  );
  const onSaveNameChange = usePerformanceStableCallback((value: string) => {
    setSaveName(value);
  });
  const onSaveDescriptionChange = usePerformanceStableCallback(
    (value: string) => {
      setSaveDescription(value);
    },
  );
  const onSaveReport = usePerformanceStableCallback(() => {
    void handleSaveReport();
  });
  const onOpenSaveDialog = usePerformanceStableCallback(() => {
    setSaveDialogOpen(true);
  });
  const onAdvancedFilterChange = usePerformanceStableCallback(
    (values: ReportsAdvancedFilterValues) => {
      setAdvancedFilterValues(values);
    },
  );
  const onClearAdvancedFilters = usePerformanceStableCallback(() => {
    setAdvancedFilterValues(EMPTY_ADVANCED);
  });
  const onRefresh = usePerformanceStableCallback(() => {
    void handleRefresh();
  });

  const templates = selectTemplatesOrEmpty(templatesQueryResult.data?.items);
  const savedReports = selectSavedReportsOrEmpty(savedQueryResult.data?.items);
  const analyticsErrorMessage =
    analyticsQueryResult.error instanceof ApiClientError
      ? analyticsQueryResult.error.message
      : analyticsQueryResult.error instanceof Error
        ? analyticsQueryResult.error.message
        : null;
  const insightsErrorMessage =
    insightsQueryResult.error instanceof ApiClientError
      ? insightsQueryResult.error.message
      : insightsQueryResult.error instanceof Error
        ? insightsQueryResult.error.message
        : null;
  const savedErrorMessage =
    savedQueryResult.error instanceof ApiClientError
      ? savedQueryResult.error.message
      : savedQueryResult.error instanceof Error
        ? savedQueryResult.error.message
        : null;

  const shellProps = usePerformanceMemo(
    (): ReportsShellProps => ({
      activeTab,
      onTabChange,
      dateRange,
      onDateRangeChange,
      onOpenFilters,
      canExport,
      exportDisabled: activeTab === "saved",
      isExporting: exportMutation.isPending,
      onExport,
      exportError,
      analyticsData: analyticsQueryResult.data,
      analyticsLoading: analyticsQueryResult.isLoading,
      analyticsError: analyticsQueryResult.isError,
      analyticsErrorMessage,
      onAnalyticsRetry,
      insight: insightsQueryResult.data,
      insightsLoading: insightsQueryResult.isLoading,
      insightsError: insightsQueryResult.isError,
      insightsErrorMessage,
      onInsightsRetry,
      templates,
      savedReports,
      savedLoading: savedQueryResult.isLoading,
      savedError: savedQueryResult.isError,
      savedErrorMessage,
      isUpdatingSaved: updateSavedMutation.isPending,
      isDeletingSaved: deleteSavedMutation.isPending,
      onSavedRetry,
      onLoadReport,
      onToggleFavorite,
      onDeleteReport,
      filtersOpen,
      onFiltersOpenChange,
      customFrom,
      customTo,
      onCustomFromChange,
      onCustomToChange,
      onApplyFilters,
      saveDialogOpen,
      onSaveDialogOpenChange,
      saveName,
      saveDescription,
      isSavingReport: createSavedMutation.isPending,
      onSaveNameChange,
      onSaveDescriptionChange,
      onSaveReport,
      onOpenSaveDialog,
      enhancedKpis,
      trendEnhancements,
      insightCards,
      businessSummary,
      recommendationCards,
      activityTimeline,
      advancedFilters,
      advancedFilterValues,
      onAdvancedFilterChange,
      onClearAdvancedFilters,
      showRefresh: refreshEnabled,
      isRefreshing,
      onRefresh,
      useSkeletons: skeletons,
      biExecutiveSummary,
      biBusinessHealth,
      biDepartmentIntelligence,
      biRecommendations,
      biHistoryCompare,
      biReportLayout,
      biSavedReports,
      biExportExperience,
    }),
    [
      activeTab,
      onTabChange,
      dateRange,
      onDateRangeChange,
      onOpenFilters,
      canExport,
      exportMutation.isPending,
      onExport,
      exportError,
      analyticsQueryResult.data,
      analyticsQueryResult.isLoading,
      analyticsQueryResult.isError,
      analyticsErrorMessage,
      onAnalyticsRetry,
      insightsQueryResult.data,
      insightsQueryResult.isLoading,
      insightsQueryResult.isError,
      insightsErrorMessage,
      onInsightsRetry,
      templates,
      savedReports,
      savedQueryResult.isLoading,
      savedQueryResult.isError,
      savedErrorMessage,
      updateSavedMutation.isPending,
      deleteSavedMutation.isPending,
      onSavedRetry,
      onLoadReport,
      onToggleFavorite,
      onDeleteReport,
      filtersOpen,
      onFiltersOpenChange,
      customFrom,
      customTo,
      onCustomFromChange,
      onCustomToChange,
      onApplyFilters,
      saveDialogOpen,
      onSaveDialogOpenChange,
      saveName,
      saveDescription,
      createSavedMutation.isPending,
      onSaveNameChange,
      onSaveDescriptionChange,
      onSaveReport,
      onOpenSaveDialog,
      enhancedKpis,
      trendEnhancements,
      insightCards,
      businessSummary,
      recommendationCards,
      activityTimeline,
      advancedFilters,
      advancedFilterValues,
      onAdvancedFilterChange,
      onClearAdvancedFilters,
      refreshEnabled,
      isRefreshing,
      onRefresh,
      skeletons,
      biExecutiveSummary,
      biBusinessHealth,
      biDepartmentIntelligence,
      biRecommendations,
      biHistoryCompare,
      biReportLayout,
      biSavedReports,
      biExportExperience,
    ],
  );

  if (!canRead) {
    return (
      <EmptyState
        title="Reports unavailable"
        description="You do not have permission to view reports."
      />
    );
  }

  return (
    <>
      {useModularShell ? (
        <ReportsEnterpriseShell {...shellProps} />
      ) : (
        <ReportsLegacyLayout {...shellProps} />
      )}
      {enhancedFeedback ? (
        <AiUiToastViewport toasts={toasts} onDismiss={dismiss} />
      ) : null}
    </>
  );
}
