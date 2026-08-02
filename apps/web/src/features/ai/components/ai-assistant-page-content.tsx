"use client";

import {
  type AiAssistModeValue,
  type AiConversation,
  type AiMessage,
} from "@enterprise/shared";
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  usePerformanceMemo,
  usePerformanceStableCallback,
  useRenderProfiler,
} from "@/features/performance";
import { ApiClientError } from "@/services/api/api-error";

import {
  isAiUiContextIndicatorsEnabled,
  isAiUiEnhancedFeedbackEnabled,
  isAiUiEnterpriseShellEnabled,
  isAiUiHistoryPaginationEnabled,
  isAiUiMobileHistorySheetEnabled,
  isAiUiProviderBadgeEnabled,
  isAiUiShortcutsEnabled,
  isAiUiSkeletonsEnabled,
  isAiUiStreamControlsEnabled,
} from "../feature-flags";
import {
  useAiChat,
  useDeleteAiConversation,
} from "../hooks/use-ai-mutations";
import { useAiConversation, useAiConversations } from "../hooks/use-ai";
import { AI_MODE_LABELS } from "../types/ai.types";
import { AiAssistantEnterpriseShell } from "./ai-assistant-enterprise-shell";
import type { AiAssistantShellProps } from "./ai-assistant-enterprise-shell";
import { AiAssistantLegacyLayout } from "./ai-assistant-legacy-layout";
import { AiUiToastViewport, useAiUiToasts } from "./ai-ui-toast";

const HISTORY_PAGE_SIZE_DEFAULT = 50;
const HISTORY_PAGE_SIZE_PAGED = 20;

/**
 * AI Assistant orchestration layer.
 * Owns selection, draft, mode, local messages, handlers, and React Query.
 * Phase 2 UX enhancements are opt-in via feature flags (default OFF).
 */
export function AiAssistantPageContent() {
  useRenderProfiler("AiAssistantPageContent");

  const enterpriseShell = isAiUiEnterpriseShellEnabled();
  const streamControls = isAiUiStreamControlsEnabled();
  const enhancedFeedback = isAiUiEnhancedFeedbackEnabled();
  const skeletons = isAiUiSkeletonsEnabled();
  const shortcuts = isAiUiShortcutsEnabled();
  const providerBadge = isAiUiProviderBadgeEnabled();
  const contextIndicators = isAiUiContextIndicatorsEnabled();
  const mobileHistorySheet = isAiUiMobileHistorySheetEnabled();
  const historyPagination = isAiUiHistoryPaginationEnabled();

  const useModularShell =
    enterpriseShell ||
    streamControls ||
    enhancedFeedback ||
    skeletons ||
    shortcuts ||
    providerBadge ||
    contextIndicators ||
    mobileHistorySheet ||
    historyPagination;

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<AiAssistModeValue>("ASK");
  const [draft, setDraft] = useState("");
  const [localMessages, setLocalMessages] = useState<AiMessage[]>([]);
  const [page, setPage] = useState(1);
  const [accumulatedConversations, setAccumulatedConversations] = useState<
    AiConversation[]
  >([]);
  const [providerLabel, setProviderLabel] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<AiConversation | null>(null);
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);
  const [streamStatusText, setStreamStatusText] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const stoppedRef = useRef(false);

  const { toasts, pushToast, dismiss } = useAiUiToasts();

  const pageSize = historyPagination
    ? HISTORY_PAGE_SIZE_PAGED
    : HISTORY_PAGE_SIZE_DEFAULT;

  const listQuery = useMemo(
    () => ({
      search: deferredSearch,
      page: historyPagination ? page : 1,
      limit: pageSize,
    }),
    [deferredSearch, historyPagination, page, pageSize],
  );

  const conversationsQuery = useAiConversations(listQuery);
  const conversationQuery = useAiConversation(selectedId);
  const chatMutation = useAiChat();
  const deleteMutation = useDeleteAiConversation();

  useEffect(() => {
    setPage(1);
    setAccumulatedConversations([]);
  }, [deferredSearch]);

  useEffect(() => {
    const items = conversationsQuery.data?.items ?? [];
    if (!historyPagination) {
      setAccumulatedConversations(items);
      return;
    }
    if (page === 1) {
      setAccumulatedConversations(items);
      return;
    }
    setAccumulatedConversations((current) => {
      const seen = new Set(current.map((item) => item.id));
      const next = items.filter((item) => !seen.has(item.id));
      return [...current, ...next];
    });
  }, [conversationsQuery.data, historyPagination, page]);

  const conversations = historyPagination
    ? accumulatedConversations
    : (conversationsQuery.data?.items ?? []);

  const pagination = conversationsQuery.data?.pagination;
  const hasMore = historyPagination
    ? (pagination?.page ?? 1) < (pagination?.totalPages ?? 1)
    : false;

  const messages = useMemo(() => {
    if (localMessages.length > 0) return localMessages;
    // New chat: never reuse keepPreviousData from the last selected conversation.
    if (!selectedId) return [];
    return conversationQuery.data?.messages ?? [];
  }, [localMessages, selectedId, conversationQuery.data?.messages]);

  useEffect(() => {
    setLocalMessages([]);
  }, [selectedId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatMutation.isPending]);

  useEffect(() => {
    if (!shortcuts) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if (meta && event.key.toLowerCase() === "n") {
        event.preventDefault();
        setSelectedId(null);
        setLocalMessages([]);
        setDraft("");
        setLastFailedMessage(null);
        setStreamStatusText(null);
        setProviderLabel(null);
        composerRef.current?.focus();
        return;
      }
      if (meta && event.key.toLowerCase() === "l") {
        event.preventDefault();
        composerRef.current?.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shortcuts]);

  const contextChips = useMemo(() => {
    if (!contextIndicators) return [];
    const chips = [
      "Workspace: EliteFlow",
      `Mode: ${AI_MODE_LABELS[mode]}`,
      selectedId ? "Session: Active conversation" : "Session: New conversation",
      "Settings: AI preferences (read-only)",
    ];
    if (providerLabel) {
      chips.push(`Provider: ${providerLabel}`);
    }
    return chips;
  }, [contextIndicators, mode, selectedId, providerLabel]);

  const handleSend = async (overrideMessage?: string) => {
    const message = (overrideMessage ?? draft).trim();
    if (!message || chatMutation.isPending) return;

    const tempUserId = `temp-user-${Date.now()}`;
    const tempAssistantId = `temp-assistant-${Date.now()}`;
    stoppedRef.current = false;

    const controller = streamControls ? new AbortController() : null;
    abortRef.current = controller;

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

    setLastFailedMessage(null);
    if (shortcuts) setStreamStatusText("Assistant is thinking");

    try {
      const result = await chatMutation.mutateAsync({
        input: {
          conversationId: selectedId ?? undefined,
          message,
          mode,
        },
        signal: controller?.signal,
        onMeta: (meta) => {
          setSelectedId(meta.conversationId);
          if (providerBadge || contextIndicators) {
            setProviderLabel(meta.provider);
          }
          if (shortcuts) setStreamStatusText("Assistant is responding");
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
      if (shortcuts) setStreamStatusText("Response complete");
    } catch (error) {
      const aborted =
        stoppedRef.current ||
        (error instanceof ApiClientError && error.code === "AI_STREAM_ABORTED");

      if (aborted) {
        setLocalMessages((current) => {
          const assistant = current.find((item) => item.id === tempAssistantId);
          if (assistant?.content?.trim()) {
            return current;
          }
          return current.filter(
            (item) => item.id !== tempUserId && item.id !== tempAssistantId,
          );
        });
        if (shortcuts) setStreamStatusText("Generation stopped");
        if (enhancedFeedback) pushToast("Generation stopped", "info");
        return;
      }

      setLocalMessages((current) =>
        current.filter(
          (item) => item.id !== tempUserId && item.id !== tempAssistantId,
        ),
      );
      setLastFailedMessage(message);
      if (shortcuts) setStreamStatusText("Response failed");
      if (enhancedFeedback) {
        pushToast(
          error instanceof Error ? error.message : "Request failed",
          "error",
        );
      }
    } finally {
      abortRef.current = null;
    }
  };

  const handleStop = () => {
    stoppedRef.current = true;
    abortRef.current?.abort();
  };

  const handleRetry = async () => {
    if (!lastFailedMessage) return;
    await handleSend(lastFailedMessage);
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
      if (enhancedFeedback) pushToast("Copied to clipboard", "success");
    } catch {
      if (enhancedFeedback) pushToast("Copy failed", "error");
    }
  };

  const executeDelete = async (conversation: AiConversation) => {
    try {
      await deleteMutation.mutateAsync(conversation.id);
      setAccumulatedConversations((current) =>
        current.filter((item) => item.id !== conversation.id),
      );
      if (selectedId === conversation.id) {
        setSelectedId(null);
        setLocalMessages([]);
      }
      if (enhancedFeedback) pushToast("Conversation deleted", "success");
    } catch (error) {
      if (enhancedFeedback) {
        pushToast(
          error instanceof Error ? error.message : "Delete failed",
          "error",
        );
      }
    }
  };

  const handleDeleteRequest = (conversation: AiConversation) => {
    if (enhancedFeedback) {
      setDeleteTarget(conversation);
      return;
    }
    void executeDelete(conversation);
  };

  const startNewConversation = () => {
    if (streamControls && chatMutation.isPending) {
      abortRef.current?.abort();
      stoppedRef.current = true;
      abortRef.current = null;
    }
    setSelectedId(null);
    setLocalMessages([]);
    setDraft("");
    setLastFailedMessage(null);
    setStreamStatusText(null);
    setProviderLabel(null);
    if (shortcuts) {
      queueMicrotask(() => composerRef.current?.focus());
    }
  };

  const onHistoryRetry = usePerformanceStableCallback(() => {
    void conversationsQuery.refetch();
  });
  const onNewConversation = usePerformanceStableCallback(() => {
    startNewConversation();
  });
  const onSelectConversation = usePerformanceStableCallback((id: string) => {
    setSelectedId(id);
  });
  const onDeleteConversation = usePerformanceStableCallback(
    (conversation: AiConversation) => {
      handleDeleteRequest(conversation);
    },
  );
  const onHeaderNewChat = usePerformanceStableCallback(() => {
    startNewConversation();
  });
  const onCopy = usePerformanceStableCallback((content: string) => {
    void handleCopy(content);
  });
  const onSend = usePerformanceStableCallback(() => {
    void handleSend();
  });
  const onRegenerate = usePerformanceStableCallback(() => {
    void handleRegenerate();
  });
  const onStopStable = usePerformanceStableCallback(() => {
    handleStop();
  });
  const onRetry = usePerformanceStableCallback(() => {
    void handleRetry();
  });
  const onLoadMore = usePerformanceStableCallback(() => {
    if (!hasMore || conversationsQuery.isFetching) return;
    setPage((current) => current + 1);
  });
  const onSearchChange = usePerformanceStableCallback((value: string) => {
    setSearch(value);
  });
  const onDraftChange = usePerformanceStableCallback((value: string) => {
    setDraft(value);
  });
  const onModeChange = usePerformanceStableCallback(
    (value: AiAssistModeValue) => {
      setMode(value);
    },
  );
  const onMobileHistoryOpenChange = usePerformanceStableCallback(
    (open: boolean) => {
      setMobileHistoryOpen(open);
    },
  );

  const historyErrorMessage =
    conversationsQuery.error instanceof Error
      ? conversationsQuery.error.message
      : "Please try again.";
  const composerErrorMessage =
    chatMutation.error instanceof ApiClientError &&
    chatMutation.error.code !== "AI_STREAM_ABORTED"
      ? chatMutation.error.message
      : null;
  const canRegenerate =
    Boolean(selectedId) && messages.some((message) => message.role === "USER");
  const isHistoryLoading = conversationsQuery.isLoading && page === 1;
  const isLoadingMore =
    historyPagination && conversationsQuery.isFetching && page > 1;
  const threadTitle = selectedId
    ? (conversationQuery.data?.title ?? "Conversation")
    : "New conversation";
  const isLoadingConversation = Boolean(
    selectedId && conversationQuery.isLoading,
  );

  const shellProps = usePerformanceMemo(
    (): AiAssistantShellProps => ({
      search,
      onSearchChange,
      conversations,
      selectedId,
      isHistoryLoading,
      isHistoryError: conversationsQuery.isError,
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
      isStreaming: chatMutation.isPending,
      onCopy,
      bottomRef,
      draft,
      onDraftChange,
      onSend,
      onRegenerate,
      composerErrorMessage,
      canRegenerate,
      useSkeletons: skeletons,
      showStreamControls: streamControls,
      onStop: onStopStable,
      onRetry,
      canRetry: Boolean(lastFailedMessage),
      showProviderBadge: providerBadge,
      providerLabel,
      showContextIndicators: contextIndicators,
      contextChips,
      showShortcuts: shortcuts,
      streamStatusText,
      showMobileHistorySheet: mobileHistorySheet,
      mobileHistoryOpen,
      onMobileHistoryOpenChange,
      showPagination: historyPagination,
      hasMore,
      isLoadingMore,
      onLoadMore,
      searchInputRef,
      composerRef,
    }),
    [
      search,
      onSearchChange,
      conversations,
      selectedId,
      isHistoryLoading,
      conversationsQuery.isError,
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
      chatMutation.isPending,
      onCopy,
      draft,
      onDraftChange,
      onSend,
      onRegenerate,
      composerErrorMessage,
      canRegenerate,
      skeletons,
      streamControls,
      onStopStable,
      onRetry,
      lastFailedMessage,
      providerBadge,
      providerLabel,
      contextIndicators,
      contextChips,
      shortcuts,
      streamStatusText,
      mobileHistorySheet,
      mobileHistoryOpen,
      onMobileHistoryOpenChange,
      historyPagination,
      hasMore,
      isLoadingMore,
      onLoadMore,
    ],
  );

  return (
    <>
      {useModularShell ? (
        <AiAssistantEnterpriseShell {...shellProps} />
      ) : (
        <AiAssistantLegacyLayout {...shellProps} />
      )}

      {enhancedFeedback ? (
        <>
          <AiUiToastViewport toasts={toasts} onDismiss={dismiss} />
          <Dialog
            open={Boolean(deleteTarget)}
            onOpenChange={(open) => {
              if (!open) setDeleteTarget(null);
            }}
          >
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Delete conversation</DialogTitle>
                <DialogDescription>
                  Delete{" "}
                  <span className="font-medium text-foreground">
                    {deleteTarget?.title}
                  </span>
                  ? This cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeleteTarget(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  isLoading={deleteMutation.isPending}
                  onClick={() => {
                    if (!deleteTarget) return;
                    const target = deleteTarget;
                    setDeleteTarget(null);
                    void executeDelete(target);
                  }}
                >
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      ) : null}
    </>
  );
}
