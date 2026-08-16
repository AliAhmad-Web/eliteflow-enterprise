"use client";

import type { AiMessage } from "@enterprise/shared";
import { Bot, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AiComposer } from "@/features/ai/components/ai-composer";
import { AiMessageList } from "@/features/ai/components/ai-message-list";
import { useAiConversation, useAiConversations } from "@/features/ai/hooks/use-ai";
import { useAiChat } from "@/features/ai/hooks/use-ai-mutations";
import { ApiClientError, getApiErrorMessage } from "@/services/api/api-error";

import {
  customerSuggestedPrompts,
  useCustomerPageContext,
} from "./use-customer-page-context";

interface CustomerAiDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function toIsoNow(): string {
  return new Date().toISOString();
}

export function CustomerAiDrawer({ open, onOpenChange }: CustomerAiDrawerProps) {
  const pageContext = useCustomerPageContext();
  const chatMutation = useAiChat();
  const conversationsQuery = useAiConversations(
    { page: 1, limit: 20, search: "" },
    { enabled: open },
  );
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  const conversationQuery = useAiConversation(conversationId, open);

  useEffect(() => {
    if (!open || chatMutation.isPending) return;
    const loaded = conversationQuery.data?.messages;
    if (conversationId && loaded) {
      setMessages(loaded);
    }
  }, [open, conversationId, conversationQuery.data, chatMutation.isPending]);

  useEffect(() => {
    if (open) {
      composerRef.current?.focus();
    }
  }, [open]);

  const prompts = useMemo(
    () => customerSuggestedPrompts(pageContext.path ?? "/"),
    [pageContext.path],
  );

  const stopStream = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const sendPrompt = useCallback(
    async (raw: string) => {
      const message = raw.trim();
      if (!message || chatMutation.isPending) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const userMessage: AiMessage = {
        id: crypto.randomUUID(),
        role: "USER",
        content: message,
        mode: "ASK",
        createdAt: toIsoNow(),
      };
      const assistantMessage: AiMessage = {
        id: crypto.randomUUID(),
        role: "ASSISTANT",
        content: "",
        mode: "ASK",
        createdAt: toIsoNow(),
      };

      setDraft("");
      setErrorMessage(null);
      setLastFailedPrompt(null);
      setMessages((current) => [...current, userMessage, assistantMessage]);

      try {
        const result = await chatMutation.mutateAsync({
          input: {
            conversationId: conversationId ?? undefined,
            message,
            mode: "ASK",
            pageContext,
          },
          signal: controller.signal,
          onMeta: (meta) => {
            setConversationId(meta.conversationId);
          },
          onDelta: (chunk) => {
            setMessages((current) => {
              if (current.length === 0) return current;
              const next = [...current];
              const last = next[next.length - 1];
              if (last?.role !== "ASSISTANT") return current;
              next[next.length - 1] = {
                ...last,
                content: `${last.content}${chunk}`,
              };
              return next;
            });
          },
        });

        setConversationId(result.conversation.id);
        if (result.assistantMessage?.content) {
          setMessages((current) => {
            const next = [...current];
            const last = next[next.length - 1];
            if (last?.role === "ASSISTANT") {
              next[next.length - 1] = result.assistantMessage;
            }
            return next;
          });
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        setLastFailedPrompt(message);
        setErrorMessage(
          error instanceof ApiClientError
            ? getApiErrorMessage(error)
            : "The assistant could not respond. Please try again.",
        );
      }
    },
    [chatMutation, conversationId, pageContext],
  );

  const startNewChat = useCallback(() => {
    stopStream();
    setConversationId(null);
    setMessages([]);
    setErrorMessage(null);
    setLastFailedPrompt(null);
    setDraft("");
  }, [stopStream]);

  const copy = useCallback(async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      // ignore clipboard failures
    }
  }, []);

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent
        id="customer-ai-drawer"
        side="right"
        overlayClassName="bg-black/40 md:bg-transparent md:pointer-events-none"
        className="w-full gap-0 border-sidebar-border bg-sidebar p-0 sm:max-w-[28rem] md:w-[28rem] md:max-w-[28rem]"
        aria-describedby={undefined}
      >
        <SheetHeader className="space-y-0 border-b border-sidebar-border px-4 py-3 text-left">
          <div className="flex items-center justify-between gap-2 pr-8">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
                <Bot className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <SheetTitle className="text-sm">AI Assistant</SheetTitle>
                <p className="truncate text-xs text-muted-foreground">
                  EliteFlow customer help
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label="New conversation"
              onClick={startNewChat}
            >
              <Plus className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </SheetHeader>

        {conversationsQuery.data?.items && conversationsQuery.data.items.length > 0 ? (
          <div className="border-b border-sidebar-border px-4 py-2">
            <label className="sr-only" htmlFor="customer-ai-history">
              Conversation history
            </label>
            <select
              id="customer-ai-history"
              className="w-full rounded-md border border-border/70 bg-background px-2 py-1.5 text-sm"
              value={conversationId ?? ""}
              onChange={(event) => {
                const nextId = event.target.value || null;
                stopStream();
                setConversationId(nextId);
                setMessages([]);
                setErrorMessage(null);
              }}
            >
              <option value="">New conversation</option>
              {conversationsQuery.data.items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <AiMessageList
          messages={messages}
          selectedId={conversationId}
          isLoadingConversation={Boolean(conversationId) && conversationQuery.isLoading}
          isStreaming={chatMutation.isPending}
          onCopy={copy}
          bottomRef={bottomRef}
          emptyTitle="Ask EliteFlow AI"
          emptyDescription="Ask about your requests, quotes, payments, invoices, or project status."
        />

        {messages.length === 0 && !chatMutation.isPending ? (
          <div className="flex flex-wrap gap-2 px-4 pb-3">
            {prompts.map((prompt) => (
              <Button
                key={prompt}
                type="button"
                variant="outline"
                size="sm"
                className="h-auto max-w-full whitespace-normal text-left text-xs"
                onClick={() => {
                  void sendPrompt(prompt);
                }}
              >
                {prompt}
              </Button>
            ))}
          </div>
        ) : null}

        <AiComposer
          draft={draft}
          onDraftChange={setDraft}
          onSend={() => {
            void sendPrompt(draft);
          }}
          onRegenerate={() => undefined}
          errorMessage={errorMessage}
          isPending={chatMutation.isPending}
          canRegenerate={false}
          showStreamControls
          onStop={stopStream}
          onRetry={() => {
            if (lastFailedPrompt) void sendPrompt(lastFailedPrompt);
          }}
          canRetry={Boolean(lastFailedPrompt)}
          composerRef={composerRef}
        />
      </SheetContent>
    </Sheet>
  );
}
