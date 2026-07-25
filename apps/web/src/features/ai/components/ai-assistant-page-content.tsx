"use client";

import {
  AI_ASSIST_MODES,
  type AiAssistModeValue,
  type AiConversation,
  type AiMessage,
} from "@enterprise/shared";
import {
  Bot,
  Copy,
  Plus,
  RefreshCw,
  Search,
  Send,
  Trash2,
} from "lucide-react";
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { EmptyState } from "@/components/common/feedback/empty-state";
import { ErrorState } from "@/components/common/feedback/error-state";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ApiClientError } from "@/services/api/api-error";
import { FORM_SELECT_CLASS_MD } from "@/lib/form-styles";
import { cn } from "@/lib/utils";

import {
  useAiChat,
  useDeleteAiConversation,
} from "../hooks/use-ai-mutations";
import { useAiConversation, useAiConversations } from "../hooks/use-ai";
import { AI_MODE_LABELS } from "../types/ai.types";
import { MarkdownView } from "./markdown-view";

const selectClassName = FORM_SELECT_CLASS_MD;

export function AiAssistantPageContent() {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<AiAssistModeValue>("ASK");
  const [draft, setDraft] = useState("");
  const [localMessages, setLocalMessages] = useState<AiMessage[]>([]);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const listQuery = useMemo(
    () => ({
      search: deferredSearch,
      page: 1,
      limit: 50,
    }),
    [deferredSearch],
  );

  const conversationsQuery = useAiConversations(listQuery);
  const conversationQuery = useAiConversation(selectedId);
  const chatMutation = useAiChat();
  const deleteMutation = useDeleteAiConversation();

  const conversations = conversationsQuery.data?.items ?? [];
  const messages =
    localMessages.length > 0
      ? localMessages
      : (conversationQuery.data?.messages ?? []);

  useEffect(() => {
    setLocalMessages([]);
  }, [selectedId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatMutation.isPending]);

  const handleSend = async (overrideMessage?: string) => {
    const message = (overrideMessage ?? draft).trim();
    if (!message || chatMutation.isPending) return;

    const tempUserId = `temp-user-${Date.now()}`;
    const tempAssistantId = `temp-assistant-${Date.now()}`;

    setLocalMessages((current) => [
      ...current,
      {
        id: tempUserId,
        role: "USER",
        content: message,
        mode,
        createdAt: new Date().toISOString(),
      },
      {
        id: tempAssistantId,
        role: "ASSISTANT",
        content: "",
        mode,
        createdAt: new Date().toISOString(),
      },
    ]);

    if (!overrideMessage) {
      setDraft("");
    }

    try {
      const result = await chatMutation.mutateAsync({
        input: {
          conversationId: selectedId ?? undefined,
          message,
          mode,
        },
        onMeta: (meta) => {
          setSelectedId(meta.conversationId);
        },
        onDelta: (chunk) => {
          setLocalMessages((current) =>
            current.map((item) =>
              item.id === tempAssistantId
                ? { ...item, content: `${item.content}${chunk}` }
                : item,
            ),
          );
        },
      });
      setSelectedId(result.conversation.id);
      setLocalMessages(result.conversation.messages ?? []);
    } catch {
      setLocalMessages((current) =>
        current.filter(
          (item) => item.id !== tempUserId && item.id !== tempAssistantId,
        ),
      );
    }
  };

  const handleRegenerate = async () => {
    const lastUser = [...messages]
      .reverse()
      .find((message) => message.role === "USER");
    if (!lastUser) return;
    await handleSend(lastUser.content);
  };

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      // ignore clipboard failures
    }
  };

  const handleDelete = async (conversation: AiConversation) => {
    try {
      await deleteMutation.mutateAsync(conversation.id);
      if (selectedId === conversation.id) {
        setSelectedId(null);
        setLocalMessages([]);
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Assistant"
        description="Ask questions, draft emails, summarize work, and generate proposals."
        actionLabel="New chat"
        onAction={() => {
          setSelectedId(null);
          setLocalMessages([]);
          setDraft("");
        }}
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
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search conversations..."
                className="pl-9"
                aria-label="Search conversations"
              />
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full justify-start border-primary/20 hover:border-primary/35 hover:bg-primary/5"
              onClick={() => {
                setSelectedId(null);
                setLocalMessages([]);
              }}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              New conversation
            </Button>

            {conversationsQuery.isLoading ? (
              <LoadingState
                label="Loading history"
                className="min-h-40 border-0 bg-transparent"
              />
            ) : null}

            {conversationsQuery.isError ? (
              <ErrorState
                title="Could not load history"
                description={
                  conversationsQuery.error instanceof Error
                    ? conversationsQuery.error.message
                    : "Please try again."
                }
                onRetry={() => void conversationsQuery.refetch()}
              />
            ) : null}

            {!conversationsQuery.isLoading &&
            !conversationsQuery.isError &&
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
                      onClick={() => setSelectedId(conversation.id)}
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
                        void handleDelete(conversation);
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
                    {conversationQuery.data?.title ?? "New conversation"}
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
                  setMode(event.target.value as AiAssistModeValue)
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
              {selectedId && conversationQuery.isLoading ? (
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
                <div
                  key={message.id}
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
                            void handleCopy(message.content);
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
                    ) : chatMutation.isPending ? (
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
              ))}

              <div ref={bottomRef} />
            </div>

            <div className="space-y-3 border-t border-border/60 bg-card/70 p-4 backdrop-blur-sm">
              {chatMutation.error instanceof ApiClientError ? (
                <p className="text-sm text-destructive" role="alert">
                  {chatMutation.error.message}
                </p>
              ) : null}

              <Textarea
                rows={3}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Ask a question or describe what you need…"
                className="min-h-22 border-primary/15 focus-visible:border-primary/35"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void handleSend();
                  }
                }}
              />

              <div className="flex flex-wrap items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={
                    chatMutation.isPending ||
                    !messages.some((message) => message.role === "USER")
                  }
                  onClick={() => {
                    void handleRegenerate();
                  }}
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  Regenerate
                </Button>
                <Button
                  type="button"
                  isLoading={chatMutation.isPending}
                  disabled={!draft.trim()}
                  onClick={() => {
                    void handleSend();
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
