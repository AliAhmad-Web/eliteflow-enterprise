"use client";

import dynamic from "next/dynamic";

import type { ReportsChartsSectionProps } from "./reports-charts-section";

const ReportsChartsSectionLazy = dynamic(
  () =>
    import("./reports-charts-section").then((m) => m.ReportsChartsSection),
  { loading: () => null },
);

/** Always lazy-split presentation charts (no eager sibling import). */
export function ReportsChartsSectionGate(props: ReportsChartsSectionProps) {
  return <ReportsChartsSectionLazy {...props} />;
}
