"use client";

import type { AiMessage } from "@enterprise/shared";
import type { RefObject } from "react";

import { EmptyState } from "@/components/common/feedback/empty-state";
import { LoadingState } from "@/components/common/feedback/loading-state";

import { AiMessageThreadSkeleton } from "./ai-assistant-skeletons";
import { AiMessageBubble } from "./ai-message-bubble";

export interface AiMessageListProps {
  messages: AiMessage[];
  selectedId: string | null;
  isLoadingConversation: boolean;
  isStreaming: boolean;
  onCopy: (content: string) => void;
  bottomRef: RefObject<HTMLDivElement | null>;
  useSkeletons?: boolean;
  streamStatusText?: string | null;
}

export function AiMessageList({
  messages,
  selectedId,
  isLoadingConversation,
  isStreaming,
  onCopy,
  bottomRef,
  useSkeletons = false,
  streamStatusText = null,
}: AiMessageListProps) {
  return (
    <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 scrollbar-thin">
      {selectedId && isLoadingConversation ? (
        useSkeletons ? (
          <AiMessageThreadSkeleton />
        ) : (
          <LoadingState
            label="Loading conversation"
            className="border-0 bg-transparent"
          />
        )
      ) : null}

      {!selectedId && messages.length === 0 ? (
        <EmptyState
          title="Ask EliteFlow AI"
          description="Choose a mode, type a prompt, and get structured help for emails, proposals, summaries, and more."
          className="border-0 bg-transparent"
        />
      ) : null}

      {messages.map((message) => (
        <AiMessageBubble
          key={message.id}
          message={message}
          isStreamingEmpty={isStreaming}
          onCopy={onCopy}
        />
      ))}

      {streamStatusText ? (
        <p className="sr-only" aria-live="polite">
          {streamStatusText}
        </p>
      ) : null}

      <div ref={bottomRef} />
    </div>
  );
}
