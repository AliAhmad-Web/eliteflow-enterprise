"use client";

import type { AiAssistModeValue, AiMessage } from "@enterprise/shared";
import { AI_ASSIST_MODES } from "@enterprise/shared";
import {
  Bot,
  Copy,
  Plus,
  RefreshCw,
  Search,
  Send,
  Trash2,
} from "lucide-react";

import { EmptyState } from "@/components/common/feedback/empty-state";
import { ErrorState } from "@/components/common/feedback/error-state";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FORM_SELECT_CLASS_MD } from "@/lib/form-styles";
import { cn } from "@/lib/utils";

import { AI_MODE_LABELS } from "../types/ai.types";
import type { AiAssistantShellProps } from "./ai-assistant-enterprise-shell";
import { MarkdownView } from "./markdown-view";

const selectClassName = FORM_SELECT_CLASS_MD;

/**
 * Pre-extraction monolithic rendering path (AI_UI_ENTERPRISE_SHELL=OFF).
 * Preserves the original JSX structure for rollback parity.
 */
export function AiAssistantLegacyLayout(props: AiAssistantShellProps) {
  const {
    search,
    onSearchChange,
    conversations,
    selectedId,
    isHistoryLoading,
    isHistoryError,
    historyErrorMessage,
    onHistoryRetry,
    onNewConversation,
    onSelectConversation,
    onDeleteConversation,
    onHeaderNewChat,
    threadTitle,
    mode,
    onModeChange,
    messages,
    isLoadingConversation,
    isStreaming,
    onCopy,
    bottomRef,
    draft,
    onDraftChange,
    onSend,
    onRegenerate,
    composerErrorMessage,
    canRegenerate,
  } = props;

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Assistant"
        description="Ask questions, draft emails, summarize work, and generate proposals."
        actionLabel="New chat"
        onAction={onHeaderNewChat}
      />

      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <Card className="border-border/50 shadow-(--shadow-sm)">
          <CardContent className="space-y-3 p-4">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search conversations..."
                className="pl-9"
                aria-label="Search conversations"
              />
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full justify-start border-primary/20 hover:border-primary/35 hover:bg-primary/5"
              onClick={onNewConversation}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              New conversation
            </Button>

            {isHistoryLoading ? (
              <LoadingState
                label="Loading history"
                className="min-h-40 border-0 bg-transparent"
              />
            ) : null}

            {isHistoryError ? (
              <ErrorState
                title="Could not load history"
                description={historyErrorMessage ?? "Please try again."}
                onRetry={onHistoryRetry}
              />
            ) : null}

            {!isHistoryLoading &&
            !isHistoryError &&
            conversations.length === 0 ? (
              <EmptyState
                title="No conversations"
                description="Start a chat to build your AI history."
                className="border-0 bg-transparent py-8"
              />
            ) : null}

            <ul className="max-h-[60vh] space-y-1 overflow-y-auto scrollbar-thin">
              {conversations.map((conversation) => (
                <li key={conversation.id}>
                  <div
                    className={cn(
                      "group flex items-start gap-1 rounded-xl border border-transparent px-2.5 py-2.5 transition-colors hover:bg-accent/50",
                      selectedId === conversation.id &&
                        "border-primary/20 bg-primary/5 shadow-(--shadow-xs)",
                    )}
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => onSelectConversation(conversation.id)}
                    >
                      <p className="truncate text-sm font-medium text-foreground">
                        {conversation.title}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {conversation.preview ?? "No messages yet"}
                      </p>
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                      aria-label={`Delete ${conversation.title}`}
                      onClick={() => {
                        onDeleteConversation(conversation);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="ai-surface overflow-hidden border-primary/20 shadow-(--shadow-glow-primary)">
          <CardContent className="flex h-[70vh] min-h-130 flex-col p-0">
            <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-card/60 px-4 py-3 backdrop-blur-sm">
              <div className="flex items-center gap-2.5">
                <div className="icon-box icon-box-sm rounded-lg bg-primary/15 text-primary ring-1 ring-primary/20">
                  <Bot strokeWidth={1.75} aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-semibold tracking-tight text-foreground">
                    {threadTitle}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Mode: {AI_MODE_LABELS[mode]}
                  </p>
                </div>
              </div>
              <select
                className={cn(selectClassName, "min-w-40")}
                value={mode}
                onChange={(event) =>
                  onModeChange(event.target.value as AiAssistModeValue)
                }
                aria-label="Assistant mode"
              >
                {AI_ASSIST_MODES.map((value) => (
                  <option key={value} value={value}>
                    {AI_MODE_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 scrollbar-thin">
              {selectedId && isLoadingConversation ? (
                <LoadingState
                  label="Loading conversation"
                  className="border-0 bg-transparent"
                />
              ) : null}

              {!selectedId && messages.length === 0 ? (
                <EmptyState
                  title="Ask EliteFlow AI"
                  description="Choose a mode, type a prompt, and get structured help for emails, proposals, summaries, and more."
                  className="border-0 bg-transparent"
                />
              ) : null}

              {messages.map((message) => (
                <LegacyMessageBubble
                  key={message.id}
                  message={message}
                  isStreamingEmpty={isStreaming}
                  onCopy={onCopy}
                />
              ))}

              <div ref={bottomRef} />
            </div>

            <div className="space-y-3 border-t border-border/60 bg-card/70 p-4 backdrop-blur-sm">
              {composerErrorMessage ? (
                <p className="text-sm text-destructive" role="alert">
                  {composerErrorMessage}
                </p>
              ) : null}

              <Textarea
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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isStreaming || !canRegenerate}
                  onClick={() => {
                    onRegenerate();
                  }}
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  Regenerate
                </Button>
                <Button
                  type="button"
                  isLoading={isStreaming}
                  disabled={!draft.trim()}
                  onClick={() => {
                    onSend();
                  }}
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  Send
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LegacyMessageBubble({
  message,
  isStreamingEmpty,
  onCopy,
}: {
  message: AiMessage;
  isStreamingEmpty: boolean;
  onCopy: (content: string) => void;
}) {
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
