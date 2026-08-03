"use client";

import dynamic from "next/dynamic";

import {
  isPerformanceAdvBundleEnabled,
  isPerformanceBundleOptimizationEnabled,
} from "@/features/performance";

import {
  ReportsChartsSection as ReportsChartsSectionEager,
  type ReportsChartsSectionProps,
} from "./reports-charts-section";

const ReportsChartsSectionLazy = dynamic(
  () =>
    import("./reports-charts-section").then((m) => m.ReportsChartsSection),
  { loading: () => null },
);

/**
 * Presentation charts: eager by default; lazy-split when Task 1.4
 * PERFORMANCE_BUNDLE_OPTIMIZATION or Phase 5 PERFORMANCE_ADV_BUNDLE is ON.
 */
export function ReportsChartsSectionGate(props: ReportsChartsSectionProps) {
  if (
    isPerformanceBundleOptimizationEnabled() ||
    isPerformanceAdvBundleEnabled()
  ) {
    return <ReportsChartsSectionLazy {...props} />;
  }
  return <ReportsChartsSectionEager {...props} />;
}
