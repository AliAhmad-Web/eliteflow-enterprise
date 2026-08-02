"use client";

import type { AiMessage } from "@enterprise/shared";
import { Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { MarkdownView } from "./markdown-view";

export interface AiMessageBubbleProps {
  message: AiMessage;
  isStreamingEmpty: boolean;
  onCopy: (content: string) => void;
}

export function AiMessageBubble({
  message,
  isStreamingEmpty,
  onCopy,
}: AiMessageBubbleProps) {
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 shadow-(--shadow-xs)",
        message.role === "USER"
          ? "ml-8 border-primary/25 bg-primary/8"
          : "mr-8 border-border/50 bg-card/80",
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {message.role === "USER" ? "You" : "Assistant"}
        </p>
        {message.role === "ASSISTANT" ? (
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label="Copy response"
              onClick={() => {
                onCopy(message.content);
              }}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : null}
      </div>
      {message.role === "ASSISTANT" ? (
        message.content ? (
          <MarkdownView content={message.content} />
        ) : isStreamingEmpty ? (
          <p className="text-sm text-muted-foreground">Thinking…</p>
        ) : (
          <MarkdownView content={message.content} />
        )
      ) : (
        <p className="whitespace-pre-wrap text-sm text-foreground">
          {message.content}
        </p>
      )}
    </div>
  );
}
