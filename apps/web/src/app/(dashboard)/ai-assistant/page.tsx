import type { Metadata } from "next";

import { AiAssistantPageContent } from "@/features/ai/components/ai-assistant-page-content";

export const metadata: Metadata = { title: "AI Assistant" };

export default function AiAssistantPage() {
  return <AiAssistantPageContent />;
}
