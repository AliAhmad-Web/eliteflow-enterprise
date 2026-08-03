import type { Metadata } from "next";

import { ReportsPageContent } from "@/features/reports/components/reports-page-content";
import { ProgressiveBoundary } from "@/features/performance";

export const metadata: Metadata = { title: "Reports" };

export default function ReportsPage() {
  return (
    <ProgressiveBoundary label="Loading Reports">
      <ReportsPageContent />
    </ProgressiveBoundary>
  );
}
