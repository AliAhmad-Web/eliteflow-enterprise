import type { Metadata } from "next";

import { LazyReportsPage } from "@/components/common/loading/lazy-feature-pages";
import { ProgressiveBoundary } from "@/features/performance";

export const metadata: Metadata = { title: "Reports" };

export default function ReportsPage() {
  return (
    <ProgressiveBoundary label="Loading Reports">
      <LazyReportsPage />
    </ProgressiveBoundary>
  );
}
