import type { Metadata } from "next";

import { AiAssistantPageContent } from "@/features/ai/components/ai-assistant-page-content";
import { ProgressiveBoundary } from "@/features/performance";

export const metadata: Metadata = { title: "AI Assistant" };

export default function AiAssistantPage() {
  return (
    <ProgressiveBoundary label="Loading AI Assistant">
      <AiAssistantPageContent />
    </ProgressiveBoundary>
  );
}
