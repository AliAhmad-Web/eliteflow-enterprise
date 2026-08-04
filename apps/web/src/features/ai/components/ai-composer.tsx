"use client";

import { Mic, MicOff, RefreshCw, Send, Square } from "lucide-react";
import type { RefObject } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import type { VoiceSessionPhase } from "../utils/voice-session";
import { voiceStatusLabel } from "../utils/voice-session";

export interface AiComposerProps {
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onRegenerate: () => void;
  errorMessage: string | null;
  isPending: boolean;
  canRegenerate: boolean;
  showStreamControls?: boolean;
  onStop?: () => void;
  onRetry?: () => void;
  canRetry?: boolean;
  composerRef?: RefObject<HTMLTextAreaElement | null>;
  /** Phase 7 Voice AI (production activation: visible when flags ON). */
  showVoiceControls?: boolean;
  voiceMode?: boolean;
  onVoiceModeChange?: (enabled: boolean) => void;
  voicePhase?: VoiceSessionPhase;
  showSpeechUi?: boolean;
  onPushToTalkStart?: () => void;
  onPushToTalkEnd?: () => void;
  onVoiceInterrupt?: () => void;
  voiceCommandsHint?: string | null;
  voiceProviderWarning?: string | null;
}

export function AiComposer({
  draft,
  onDraftChange,
  onSend,
  onRegenerate,
  errorMessage,
  isPending,
  canRegenerate,
  showStreamControls = false,
  onStop,
  onRetry,
  canRetry = false,
  composerRef,
  showVoiceControls = false,
  voiceMode = false,
  onVoiceModeChange,
  voicePhase = "idle",
  showSpeechUi = false,
  onPushToTalkStart,
  onPushToTalkEnd,
  onVoiceInterrupt,
  voiceCommandsHint = null,
  voiceProviderWarning = null,
}: AiComposerProps) {
  const listening = voicePhase === "listening";
  const thinking =
    voicePhase === "thinking" || voicePhase === "sending" || isPending;
  const speaking =
    voicePhase === "responding" || voicePhase === "acknowledging";
  const statusHighlight = listening
    ? "listening"
    : thinking
      ? "thinking"
      : speaking
        ? "speaking"
        : "idle";

  return (
    <div className="space-y-3 border-t border-border/60 bg-card/70 p-4 backdrop-blur-sm">
      {errorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {showVoiceControls ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant={voiceMode ? "default" : "outline"}
              size="sm"
              aria-pressed={voiceMode}
              aria-label={voiceMode ? "Voice mode on" : "Voice mode off"}
              onClick={() => onVoiceModeChange?.(!voiceMode)}
            >
              {voiceMode ? (
                <Mic className="h-4 w-4" aria-hidden="true" />
              ) : (
                <MicOff className="h-4 w-4" aria-hidden="true" />
              )}
              Voice {voiceMode ? "on" : "off"}
            </Button>
            {voiceMode ? (
              <span
                className={cn(
                  "rounded-md border px-2 py-0.5 text-[11px]",
                  statusHighlight === "listening"
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : statusHighlight === "thinking"
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200"
                      : statusHighlight === "speaking"
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : "border-border/60 bg-background/70 text-muted-foreground",
                )}
                role="status"
              >
                {listening
                  ? "Listening..."
                  : thinking
                    ? "Thinking..."
                    : voiceStatusLabel(voicePhase)}
              </span>
            ) : null}
            {voiceMode && voiceCommandsHint ? (
              <span className="text-[11px] text-muted-foreground">
                {voiceCommandsHint}
              </span>
            ) : null}
          </div>
          {voiceMode && voiceProviderWarning ? (
            <p
              className="rounded-md border border-warning/30 bg-warning/10 px-2 py-1.5 text-[11px] text-foreground"
              role="status"
            >
              {voiceProviderWarning}
            </p>
          ) : null}
        </div>
      ) : null}

      <Textarea
        ref={composerRef}
        rows={3}
        value={draft}
        onChange={(event) => onDraftChange(event.target.value)}
        placeholder={
          voiceMode
            ? "Voice mode — type a message or start recording…"
            : "Ask a question or describe what you need…"
        }
        className="min-h-22 border-primary/15 focus-visible:border-primary/35"
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            onSend();
          }
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending || !canRegenerate}
            onClick={() => {
              onRegenerate();
            }}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Regenerate
          </Button>
          {showStreamControls && canRetry && !isPending ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onRetry?.();
              }}
            >
              Retry
            </Button>
          ) : null}
          {showVoiceControls && showSpeechUi && voiceMode ? (
            <Button
              type="button"
              variant={listening ? "default" : "outline"}
              size="sm"
              disabled={isPending}
              aria-pressed={listening}
              aria-label={listening ? "Stop listening" : "Start listening"}
              onClick={() => {
                if (listening) {
                  onPushToTalkEnd?.();
                } else {
                  onPushToTalkStart?.();
                }
              }}
            >
              <Mic className="h-4 w-4" aria-hidden="true" />
              {listening ? "Stop" : "Speak"}
            </Button>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {showVoiceControls &&
          voiceMode &&
          (thinking || speaking || listening) ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onVoiceInterrupt?.();
              }}
            >
              <Square className="h-3.5 w-3.5" aria-hidden="true" />
              Interrupt
            </Button>
          ) : null}
          {showStreamControls && isPending ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onStop?.();
              }}
            >
              <Square className="h-3.5 w-3.5" aria-hidden="true" />
              Stop
            </Button>
          ) : null}
          <Button
            type="button"
            isLoading={isPending}
            disabled={!draft.trim() || isPending}
            onClick={() => {
              onSend();
            }}
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
