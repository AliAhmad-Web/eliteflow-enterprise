"use client";

import type { AiAssistModeValue, AiConversation, AiMessage } from "@enterprise/shared";
import { History } from "lucide-react";
import type { RefObject } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { AiComposer } from "./ai-composer";
import { AiConversationSidebar } from "./ai-conversation-sidebar";
import { AiMessageList } from "./ai-message-list";
import { AiThreadHeader } from "./ai-thread-header";

export interface AiAssistantShellProps {
  search: string;
  onSearchChange: (value: string) => void;
  conversations: AiConversation[];
  selectedId: string | null;
  isHistoryLoading: boolean;
  isHistoryError: boolean;
  historyErrorMessage: string | null;
  onHistoryRetry: () => void;
  onNewConversation: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (conversation: AiConversation) => void;
  onHeaderNewChat: () => void;
  threadTitle: string;
  mode: AiAssistModeValue;
  onModeChange: (mode: AiAssistModeValue) => void;
  messages: AiMessage[];
  isLoadingConversation: boolean;
  isStreaming: boolean;
  onCopy: (content: string) => void;
  bottomRef: RefObject<HTMLDivElement | null>;
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onRegenerate: () => void;
  composerErrorMessage: string | null;
  canRegenerate: boolean;
  /** Phase 2 optional enhancements */
  useSkeletons?: boolean;
  showStreamControls?: boolean;
  onStop?: () => void;
  onRetry?: () => void;
  canRetry?: boolean;
  showProviderBadge?: boolean;
  providerLabel?: string | null;
  showContextIndicators?: boolean;
  contextChips?: string[];
  showShortcuts?: boolean;
  streamStatusText?: string | null;
  showMobileHistorySheet?: boolean;
  mobileHistoryOpen?: boolean;
  onMobileHistoryOpenChange?: (open: boolean) => void;
  showPagination?: boolean;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  searchInputRef?: RefObject<HTMLInputElement | null>;
  composerRef?: RefObject<HTMLTextAreaElement | null>;
}

/** Extracted composition path (enterprise shell / Phase 2 UX). */
export function AiAssistantEnterpriseShell(props: AiAssistantShellProps) {
  const sidebarProps = {
    search: props.search,
    onSearchChange: props.onSearchChange,
    conversations: props.conversations,
    selectedId: props.selectedId,
    isLoading: props.isHistoryLoading,
    isError: props.isHistoryError,
    errorMessage: props.historyErrorMessage,
    onRetry: props.onHistoryRetry,
    onNewConversation: props.onNewConversation,
    onSelect: props.onSelectConversation,
    onDelete: props.onDeleteConversation,
    useSkeletons: props.useSkeletons,
    showPagination: props.showPagination,
    hasMore: props.hasMore,
    isLoadingMore: props.isLoadingMore,
    onLoadMore: props.onLoadMore,
    searchInputRef: props.searchInputRef,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Assistant"
        description="Ask questions, draft emails, summarize work, and generate proposals."
        actionLabel="New chat"
        onAction={props.onHeaderNewChat}
      />

      {props.showMobileHistorySheet ? (
        <div className="flex items-center gap-2 lg:hidden">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => props.onMobileHistoryOpenChange?.(true)}
          >
            <History className="h-4 w-4" aria-hidden="true" />
            History
          </Button>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div
          className={
            props.showMobileHistorySheet ? "hidden lg:block" : undefined
          }
        >
          <AiConversationSidebar {...sidebarProps} />
        </div>

        <Card className="ai-surface overflow-hidden border-primary/20 shadow-(--shadow-glow-primary)">
          <CardContent className="flex h-[70vh] min-h-130 flex-col p-0">
            <AiThreadHeader
              title={props.threadTitle}
              mode={props.mode}
              onModeChange={props.onModeChange}
              showProviderBadge={props.showProviderBadge}
              providerLabel={props.providerLabel}
              showContextIndicators={props.showContextIndicators}
              contextChips={props.contextChips}
            />
            <AiMessageList
              messages={props.messages}
              selectedId={props.selectedId}
              isLoadingConversation={props.isLoadingConversation}
              isStreaming={props.isStreaming}
              onCopy={props.onCopy}
              bottomRef={props.bottomRef}
              useSkeletons={props.useSkeletons}
              streamStatusText={
                props.showShortcuts ? props.streamStatusText : null
              }
            />
            <AiComposer
              draft={props.draft}
              onDraftChange={props.onDraftChange}
              onSend={props.onSend}
              onRegenerate={props.onRegenerate}
              errorMessage={props.composerErrorMessage}
              isPending={props.isStreaming}
              canRegenerate={props.canRegenerate}
              showStreamControls={props.showStreamControls}
              onStop={props.onStop}
              onRetry={props.onRetry}
              canRetry={props.canRetry}
              composerRef={props.composerRef}
            />
          </CardContent>
        </Card>
      </div>

      {props.showMobileHistorySheet ? (
        <Sheet
          open={Boolean(props.mobileHistoryOpen)}
          onOpenChange={(open) => props.onMobileHistoryOpenChange?.(open)}
        >
          <SheetContent side="left" className="w-full p-0 sm:max-w-sm">
            <SheetHeader className="border-b border-border px-4 py-4 text-left">
              <SheetTitle>Conversation history</SheetTitle>
            </SheetHeader>
            <AiConversationSidebar
              {...sidebarProps}
              asCard={false}
              onSelect={(id) => {
                props.onSelectConversation(id);
                props.onMobileHistoryOpenChange?.(false);
              }}
              onNewConversation={() => {
                props.onNewConversation();
                props.onMobileHistoryOpenChange?.(false);
              }}
            />
          </SheetContent>
        </Sheet>
      ) : null}
    </div>
  );
}
