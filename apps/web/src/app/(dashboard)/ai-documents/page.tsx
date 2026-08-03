import type { Metadata } from "next";

import { AiDocumentsPageContent } from "@/features/ai/components/ai-documents-page-content";
import { ProgressiveBoundary } from "@/features/performance";

export const metadata: Metadata = { title: "AI Documents" };

export default function AiDocumentsPage() {
  return (
    <ProgressiveBoundary label="Loading AI Documents">
      <AiDocumentsPageContent />
    </ProgressiveBoundary>
  );
}
