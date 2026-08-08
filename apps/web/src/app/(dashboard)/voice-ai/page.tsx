import type { Metadata } from "next";

import { LazyVoiceAiPage } from "@/components/common/loading/lazy-feature-pages";

export const metadata: Metadata = { title: "Voice AI" };

export default function VoiceAiPage() {
  return <LazyVoiceAiPage />;
}
