"use client";

import { Mic } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { isCommunicationVoiceAiPageEnabled } from "../feature-flags";
import {
  formatProviderStatusBadge,
  getVoiceSttProviderInfo,
  getVoiceTtsProviderInfo,
} from "../utils/provider-status";

/**
 * Communication → Voice AI entry. Reuses AI Assistant (no second chat).
 * Sidebar visibility is gated by COMMUNICATION_VOICE_AI_PAGE (default OFF).
 */
export function VoiceAiPageContent() {
  const enabled = isCommunicationVoiceAiPageEnabled();
  const stt = getVoiceSttProviderInfo();
  const tts = getVoiceTtsProviderInfo();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Voice AI"
        description="Speech-to-text and text-to-speech on the existing AI Assistant."
      />
      {!enabled ? (
        <p className="text-sm text-muted-foreground">
          This standalone page is hidden. Voice AI remains available in{" "}
          <Link href={ROUTES.AI_ASSISTANT} className="underline">
            AI Assistant
          </Link>{" "}
          and{" "}
          <Link href={ROUTES.EMAIL_AUTOMATION} className="underline">
            Email Automation
          </Link>
          . Set{" "}
          <code className="text-xs">NEXT_PUBLIC_COMMUNICATION_VOICE_AI_PAGE=true</code>{" "}
          to show this page in the sidebar again.
        </p>
      ) : (
        <section className="space-y-3 rounded-lg border border-border/60 bg-card/50 px-3 py-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Mic className="h-4 w-4" aria-hidden="true" />
            <span className="font-medium text-foreground">Voice providers</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>STT</span>
            <Badge variant={stt.status === "ready" ? "success" : "warning"}>
              {formatProviderStatusBadge(stt.status)}
            </Badge>
            <span>{stt.message}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>TTS</span>
            <Badge variant={tts.status === "ready" ? "success" : "warning"}>
              {formatProviderStatusBadge(tts.status)}
            </Badge>
            <span>{tts.message}</span>
          </div>
          <Button asChild size="sm">
            <Link href={ROUTES.AI_ASSISTANT}>Open AI Assistant</Link>
          </Button>
        </section>
      )}
    </div>
  );
}
