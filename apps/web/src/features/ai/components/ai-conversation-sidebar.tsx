"use client";

import type { AiConversation } from "@enterprise/shared";
import { Plus, Search } from "lucide-react";
import type { RefObject } from "react";

import { VirtualizedList } from "@/components/common/data/virtualized-list";
import { EmptyState } from "@/components/common/feedback/empty-state";
import { ErrorState } from "@/components/common/feedback/error-state";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { isPerformanceAdvVirtualizationEnabled } from "@/features/performance";

import { AiConversationListSkeleton } from "./ai-assistant-skeletons";
import { AiConversationListItem } from "./ai-conversation-list-item";

export interface AiConversationSidebarProps {
  search: string;
  onSearchChange: (value: string) => void;
  conversations: AiConversation[];
  selectedId: string | null;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  onRetry: () => void;
  onNewConversation: () => void;
  onSelect: (id: string) => void;
  onDelete: (conversation: AiConversation) => void;
  useSkeletons?: boolean;
  showPagination?: boolean;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  searchInputRef?: RefObject<HTMLInputElement | null>;
  className?: string;
  asCard?: boolean;
}

export function AiConversationSidebar({
  search,
  onSearchChange,
  conversations,
  selectedId,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  onNewConversation,
  onSelect,
  onDelete,
  useSkeletons = false,
  showPagination = false,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  searchInputRef,
  className,
  asCard = true,
}: AiConversationSidebarProps) {
  const useVirtual = isPerformanceAdvVirtualizationEnabled();

  const body = (
    <div className="space-y-3 p-4">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          ref={searchInputRef}
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

      {isLoading ? (
        useSkeletons ? (
          <AiConversationListSkeleton />
        ) : (
          <LoadingState
            label="Loading history"
            className="min-h-40 border-0 bg-transparent"
          />
        )
      ) : null}

      {isError ? (
        <ErrorState
          title="Could not load history"
          description={errorMessage ?? "Please try again."}
          onRetry={onRetry}
        />
      ) : null}

      {!isLoading && !isError && conversations.length === 0 ? (
        <EmptyState
          title="No conversations"
          description="Start a chat to build your AI history."
          className="border-0 bg-transparent py-8"
        />
      ) : null}

      {useVirtual && !isLoading && !isError && conversations.length > 0 ? (
        <VirtualizedList
          items={conversations}
          estimateSize={72}
          overscan={6}
          heightClassName="max-h-[60vh]"
          getItemKey={(conversation) => conversation.id}
          renderItem={(conversation) => (
            <div className="pb-1">
              <AiConversationListItem
                conversation={conversation}
                selected={selectedId === conversation.id}
                onSelect={onSelect}
                onDelete={onDelete}
              />
            </div>
          )}
        />
      ) : null}

      {!useVirtual ? (
        <ul className="max-h-[60vh] space-y-1 overflow-y-auto scrollbar-thin">
          {conversations.map((conversation) => (
            <li key={conversation.id}>
              <AiConversationListItem
                conversation={conversation}
                selected={selectedId === conversation.id}
                onSelect={onSelect}
                onDelete={onDelete}
              />
            </li>
          ))}
        </ul>
      ) : null}

      {showPagination && hasMore ? (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          isLoading={isLoadingMore}
          onClick={() => {
            onLoadMore?.();
          }}
        >
          Load more
        </Button>
      ) : null}
    </div>
  );

  if (!asCard) {
    return <div className={className}>{body}</div>;
  }

  return (
    <Card className={`border-border/50 shadow-(--shadow-sm) ${className ?? ""}`}>
      <CardContent className="p-0">{body}</CardContent>
    </Card>
  );
}
