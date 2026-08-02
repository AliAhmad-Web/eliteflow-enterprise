"use client";

import dynamic from "next/dynamic";

import { isPerformanceBundleOptimizationEnabled } from "@/features/performance";

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
 * Presentation charts: eager by default; lazy-split when PERFORMANCE_BUNDLE_OPTIMIZATION is ON.
 */
export function ReportsChartsSectionGate(props: ReportsChartsSectionProps) {
  if (isPerformanceBundleOptimizationEnabled()) {
    return <ReportsChartsSectionLazy {...props} />;
  }
  return <ReportsChartsSectionEager {...props} />;
}
