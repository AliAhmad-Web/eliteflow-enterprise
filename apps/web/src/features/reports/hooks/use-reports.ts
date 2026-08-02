"use client";

import { useQuery } from "@tanstack/react-query";
import type { AnalyticsQueryInput } from "@enterprise/shared";

import { getPerformanceListStaleTimeMs } from "@/features/performance";

import { reportsService } from "../services/reports.service";
import { REPORTS_QUERY_KEYS } from "../types/reports.types";

export function useAnalytics(query: AnalyticsQueryInput, enabled = true) {
  return useQuery({
    queryKey: REPORTS_QUERY_KEYS.analyticsQuery(query),
    queryFn: () => reportsService.getAnalytics(query),
    enabled,
    staleTime: getPerformanceListStaleTimeMs(),
  });
}

export function useAiInsights(query: AnalyticsQueryInput, enabled = true) {
  return useQuery({
    queryKey: REPORTS_QUERY_KEYS.insightsQuery(query),
    queryFn: () => reportsService.getInsights(query),
    enabled,
    staleTime: getPerformanceListStaleTimeMs(),
  });
}

export function useReportTemplates(enabled = true) {
  return useQuery({
    queryKey: REPORTS_QUERY_KEYS.templates(),
    queryFn: () => reportsService.listTemplates(),
    enabled,
    staleTime: getPerformanceListStaleTimeMs(),
  });
}

export function useSavedReports(enabled = true) {
  return useQuery({
    queryKey: REPORTS_QUERY_KEYS.saved(),
    queryFn: () => reportsService.listSaved(),
    enabled,
    staleTime: getPerformanceListStaleTimeMs(),
  });
}
