import type { Metadata } from "next";

import { LazyAiAssistantPage } from "@/components/common/loading/lazy-feature-pages";
import { ProgressiveBoundary } from "@/features/performance";

export const metadata: Metadata = { title: "AI Assistant" };

export default function AiAssistantPage() {
  return (
    <ProgressiveBoundary label="Loading AI Assistant">
      <LazyAiAssistantPage />
    </ProgressiveBoundary>
  );
}
