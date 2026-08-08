import type { Metadata } from "next";

import { LazyAiDocumentsPage } from "@/components/common/loading/lazy-feature-pages";
import { ProgressiveBoundary } from "@/features/performance";

export const metadata: Metadata = { title: "AI Documents" };

export default function AiDocumentsPage() {
  return (
    <ProgressiveBoundary label="Loading AI Documents">
      <LazyAiDocumentsPage />
    </ProgressiveBoundary>
  );
}
