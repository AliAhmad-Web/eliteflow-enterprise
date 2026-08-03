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

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  isCommunicationFeedbackEnabled,
  isCommunicationSpeechToTextEnabled,
  isCommunicationSpeechUiEnabled,
  isCommunicationTextToSpeechEnabled,
  isCommunicationVoiceActionsEnabled,
  isCommunicationVoiceAiEnabled,
  isCommunicationVoiceAssistantEnabled,
  isCommunicationVoiceCommandsEnabled,
  isCommunicationVoicePresentationEnabled,
  getVoiceSttProviderInfo,
  getVoiceTtsProviderInfo,
} from "@/features/communication";
import {
  useAdvancedPerformanceProfiler,
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
import {
  isVoiceSttReady,
  isVoiceTtsReady,
  speakBrowserText,
  startBrowserSpeechRecognition,
  stopBrowserSpeechSynthesis,
} from "../utils/speech-providers";
import type { VoiceSessionPhase } from "../utils/voice-session";
import {
  nextVoicePhaseOnIdle,
  nextVoicePhaseOnInterrupt,
  nextVoicePhaseOnStreamProgress,
  nextVoicePhaseOnStreamStart,
} from "../utils/voice-session";
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
  useAdvancedPerformanceProfiler("AiAssistantPageContent");

  const enterpriseShell = isAiUiEnterpriseShellEnabled();
  const streamControls = isAiUiStreamControlsEnabled();
  const enhancedFeedback = isAiUiEnhancedFeedbackEnabled();
  const skeletons = isAiUiSkeletonsEnabled();
  const shortcuts = isAiUiShortcutsEnabled();
  const providerBadge = isAiUiProviderBadgeEnabled();
  const contextIndicators = isAiUiContextIndicatorsEnabled();
  const mobileHistorySheet = isAiUiMobileHistorySheetEnabled();
  const historyPagination = isAiUiHistoryPaginationEnabled();

  const voicePresentation = isCommunicationVoicePresentationEnabled();
  const voiceAi = isCommunicationVoiceAiEnabled();
  const voiceAssistant = isCommunicationVoiceAssistantEnabled();
  const speechUi = isCommunicationSpeechUiEnabled();
  const voiceActions = isCommunicationVoiceActionsEnabled();
  const voiceCommands = isCommunicationVoiceCommandsEnabled();
  const speechToText = isCommunicationSpeechToTextEnabled();
  const textToSpeech = isCommunicationTextToSpeechEnabled();
  const communicationFeedback = isCommunicationFeedbackEnabled();

  const showVoiceControls = voicePresentation && voiceAi;
  const feedbackToasts = enhancedFeedback || communicationFeedback;

  const useModularShell =
    enterpriseShell ||
    streamControls ||
    enhancedFeedback ||
    skeletons ||
    shortcuts ||
    providerBadge ||
    contextIndicators ||
    mobileHistorySheet ||
    historyPagination ||
    showVoiceControls;

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
  const [voiceMode, setVoiceMode] = useState(false);
  const [voicePhase, setVoicePhase] = useState<VoiceSessionPhase>("idle");

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const speechStopRef = useRef<(() => void) | null>(null);
  const listeningTranscriptRef = useRef("");
  const ttsActiveRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const stoppedRef = useRef(false);

  const { toasts, pushToast, dismiss } = useAiUiToasts();

  const stopSpeechListen = () => {
    speechStopRef.current?.();
    speechStopRef.current = null;
  };

  const stopVoicePlayback = () => {
    ttsActiveRef.current = false;
    stopBrowserSpeechSynthesis();
  };

  useEffect(() => {
    return () => {
      stopSpeechListen();
      stopVoicePlayback();
    };
  }, []);

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
    if (!contextIndicators && !showVoiceControls) return [];
    const chips: string[] = [];
    if (contextIndicators) {
      chips.push(
        "Workspace: EliteFlow",
        `Mode: ${AI_MODE_LABELS[mode]}`,
        selectedId ? "Session: Active conversation" : "Session: New conversation",
        "Settings: AI preferences (read-only)",
      );
      if (providerLabel) {
        chips.push(`Provider: ${providerLabel}`);
      }
    }
    if (showVoiceControls && voiceMode) {
      chips.push("Voice session: active");
      if (voiceActions) {
        chips.push("Voice → Action Framework");
      }
    }
    return chips;
  }, [
    contextIndicators,
    mode,
    selectedId,
    providerLabel,
    showVoiceControls,
    voiceMode,
    voiceActions,
  ]);

  const handleSend = async (overrideMessage?: string) => {
    const message = (overrideMessage ?? draft).trim();
    if (!message || chatMutation.isPending) return;

    const tempUserId = `temp-user-${Date.now()}`;
    const tempAssistantId = `temp-assistant-${Date.now()}`;
    stoppedRef.current = false;

    const controller =
      streamControls || showVoiceControls ? new AbortController() : null;
    abortRef.current = controller;

    if (showVoiceControls && voiceMode) {
      setVoicePhase(nextVoicePhaseOnStreamStart(true));
    }

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
    if (showVoiceControls && voiceMode && voiceActions) {
      setStreamStatusText("Voice turn → Action Framework");
    }

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
          if (showVoiceControls && voiceMode) {
            setVoicePhase(nextVoicePhaseOnStreamProgress(true));
          }
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
      if (showVoiceControls && voiceMode) {
        const assistantReply = [...(result.conversation.messages ?? [])]
          .reverse()
          .find((item) => item.role === "ASSISTANT")
          ?.content?.trim();

        if (
          textToSpeech &&
          isVoiceTtsReady() &&
          assistantReply &&
          !stoppedRef.current
        ) {
          setVoicePhase("responding");
          ttsActiveRef.current = true;
          void speakBrowserText(assistantReply, {
            onError: (msg) => {
              if (feedbackToasts) pushToast(msg, "error");
            },
            onEnd: () => {
              ttsActiveRef.current = false;
              if (voiceAssistant) {
                setVoicePhase("listening");
                if (feedbackToasts) {
                  pushToast("Ready for next voice turn", "info");
                }
              } else {
                setVoicePhase(nextVoicePhaseOnIdle());
              }
            },
          });
        } else if (voiceAssistant) {
          setVoicePhase("listening");
          if (feedbackToasts) {
            pushToast(
              textToSpeech && !isVoiceTtsReady()
                ? "Ready for next voice turn (TTS unavailable)"
                : "Ready for next voice turn",
              "info",
            );
          }
        } else {
          setVoicePhase(nextVoicePhaseOnIdle());
        }
      }
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
        if (feedbackToasts) pushToast("Generation stopped", "info");
        if (showVoiceControls) {
          setVoicePhase(nextVoicePhaseOnInterrupt());
        }
        return;
      }

      setLocalMessages((current) =>
        current.filter(
          (item) => item.id !== tempUserId && item.id !== tempAssistantId,
        ),
      );
      setLastFailedMessage(message);
      if (shortcuts) setStreamStatusText("Response failed");
      if (feedbackToasts) {
        pushToast(
          error instanceof Error ? error.message : "Request failed",
          "error",
        );
      }
      if (showVoiceControls) {
        setVoicePhase(nextVoicePhaseOnIdle());
      }
    } finally {
      abortRef.current = null;
    }
  };

  const handleStop = () => {
    stoppedRef.current = true;
    abortRef.current?.abort();
  };

  const handleVoiceInterrupt = () => {
    stopSpeechListen();
    stopVoicePlayback();
    handleStop();
    setVoicePhase(nextVoicePhaseOnInterrupt());
    if (feedbackToasts) pushToast("Voice interrupted", "info");
  };

  const handlePushToTalkStart = () => {
    if (!showVoiceControls || !voiceMode || chatMutation.isPending) return;
    stopVoicePlayback();
    stopSpeechListen();
    listeningTranscriptRef.current = "";
    setVoicePhase("listening");

    if (!speechToText || !isVoiceSttReady()) {
      if (feedbackToasts) {
        pushToast(
          speechToText
            ? "Speech recognition unavailable in this browser — type your message"
            : "Speech-to-Text flag is off — type your message",
          "info",
        );
      }
      return;
    }

    const session = startBrowserSpeechRecognition({
      onInterim: (text) => {
        listeningTranscriptRef.current = text;
        setDraft(text);
      },
      onFinal: (text) => {
        listeningTranscriptRef.current = text;
        setDraft(text);
      },
      onError: (message) => {
        if (feedbackToasts) pushToast(message, "error");
        setVoicePhase(nextVoicePhaseOnIdle());
      },
    });

    if (!session) {
      if (feedbackToasts) {
        pushToast(
          "Could not start microphone / speech recognition. Check browser permissions.",
          "error",
        );
      }
      setVoicePhase(nextVoicePhaseOnIdle());
      return;
    }

    speechStopRef.current = session.stop;
  };

  const handlePushToTalkEnd = () => {
    if (!showVoiceControls || !voiceMode) return;
    stopSpeechListen();
    const spoken = listeningTranscriptRef.current.trim() || draft.trim();
    if (spoken) {
      setDraft(spoken);
      void handleSend(spoken);
      return;
    }
    setVoicePhase(nextVoicePhaseOnIdle());
    if (feedbackToasts) {
      pushToast("No speech captured — try again or type your message", "info");
    }
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
      if (feedbackToasts) pushToast("Copied to clipboard", "success");
    } catch {
      if (feedbackToasts) pushToast("Copy failed", "error");
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
      if (feedbackToasts) pushToast("Conversation deleted", "success");
    } catch (error) {
      if (feedbackToasts) {
        pushToast(
          error instanceof Error ? error.message : "Delete failed",
          "error",
        );
      }
    }
  };

  const handleDeleteRequest = (conversation: AiConversation) => {
    if (feedbackToasts) {
      setDeleteTarget(conversation);
      return;
    }
    void executeDelete(conversation);
  };

  const startNewConversation = () => {
    if ((streamControls || showVoiceControls) && chatMutation.isPending) {
      abortRef.current?.abort();
      stoppedRef.current = true;
      abortRef.current = null;
    }
    stopSpeechListen();
    stopVoicePlayback();
    setSelectedId(null);
    setLocalMessages([]);
    setDraft("");
    setLastFailedMessage(null);
    setStreamStatusText(null);
    setProviderLabel(null);
    setVoicePhase(nextVoicePhaseOnIdle());
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
  const onVoiceModeChange = usePerformanceStableCallback((enabled: boolean) => {
    if (!enabled) {
      stopSpeechListen();
      stopVoicePlayback();
    }
    setVoiceMode(enabled);
    setVoicePhase(nextVoicePhaseOnIdle());
    if (feedbackToasts) {
      pushToast(enabled ? "Voice mode enabled" : "Voice mode disabled", "info");
    }
  });
  const onPushToTalkStart = usePerformanceStableCallback(() => {
    handlePushToTalkStart();
  });
  const onPushToTalkEnd = usePerformanceStableCallback(() => {
    handlePushToTalkEnd();
  });
  const onVoiceInterrupt = usePerformanceStableCallback(() => {
    handleVoiceInterrupt();
  });

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

  const voiceCommandsHint =
    showVoiceControls && voiceMode && (voiceCommands || voiceActions)
      ? "Spoken turns use the same Action Framework as typed prompts"
      : null;

  const voiceProviderWarning = showVoiceControls
    ? (() => {
        const stt = getVoiceSttProviderInfo();
        const tts = getVoiceTtsProviderInfo();
        if (stt.status === "ready" && tts.status === "ready") return null;
        return [stt.message, tts.message].join(" ");
      })()
    : null;

  const showVoiceContextChips = showVoiceControls && voiceMode;

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
      showContextIndicators: contextIndicators || showVoiceContextChips,
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
      showVoiceControls,
      voiceMode,
      onVoiceModeChange,
      voicePhase,
      showSpeechUi: speechUi,
      onPushToTalkStart,
      onPushToTalkEnd,
      onVoiceInterrupt,
      voiceCommandsHint,
      voiceProviderWarning,
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
      showVoiceContextChips,
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
      showVoiceControls,
      voiceMode,
      onVoiceModeChange,
      voicePhase,
      speechUi,
      onPushToTalkStart,
      onPushToTalkEnd,
      onVoiceInterrupt,
      voiceCommandsHint,
      voiceProviderWarning,
    ],
  );

  return (
    <>
      {useModularShell ? (
        <AiAssistantEnterpriseShell {...shellProps} />
      ) : (
        <AiAssistantLegacyLayout {...shellProps} />
      )}

      {feedbackToasts ? (
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
