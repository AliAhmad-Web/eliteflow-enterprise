"use client";

import { RefreshCw, Send, Square } from "lucide-react";
import type { RefObject } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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
}: AiComposerProps) {
  return (
    <div className="space-y-3 border-t border-border/60 bg-card/70 p-4 backdrop-blur-sm">
      {errorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <Textarea
        ref={composerRef}
        rows={3}
        value={draft}
        onChange={(event) => onDraftChange(event.target.value)}
        placeholder="Ask a question or describe what you need…"
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
        </div>
        <div className="flex flex-wrap gap-2">
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
