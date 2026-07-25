import type { Metadata } from "next";

import { AiDocumentsPageContent } from "@/features/ai/components/ai-documents-page-content";

export const metadata: Metadata = { title: "AI Documents" };

export default function AiDocumentsPage() {
  return <AiDocumentsPageContent />;
}
