import type { Metadata } from "next";

import { VoiceAiPageContent } from "@/features/communication/components/voice-ai-page-content";

export const metadata: Metadata = { title: "Voice AI" };

export default function VoiceAiPage() {
  return <VoiceAiPageContent />;
}
