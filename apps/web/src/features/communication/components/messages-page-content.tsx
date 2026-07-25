"use client";

import { PERMISSIONS } from "@enterprise/shared";
import { MessageSquare, Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/common/feedback/empty-state";
import { ErrorState } from "@/components/common/feedback/error-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/features/auth/stores/auth.store";
import { useHasPermission } from "@/features/rbac/hooks/use-permissions";
import { cn } from "@/lib/utils";

import { useConversation } from "../hooks/use-communication";
import { useMarkRead } from "../hooks/use-communication-mutations";
import { parseMessagesDeepLink } from "../utils/messages-deep-link";
import { ChatThreadSkeleton } from "./communication-skeletons";
import { ChatThread } from "./chat-thread";
import { ConversationDetailsPanel } from "./conversation-details-panel";
import { ConversationList } from "./conversation-list";

type Panel = "list" | "thread" | "details";

export function MessagesPageContent() {
  const canRead = useHasPermission(PERMISSIONS.CHAT_READ);
  const currentUserId = useAuthStore((s) => s.user?.id ?? "");
  const searchParams = useSearchParams();
  const router = useRouter();

  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<Panel>("list");
  const [focusMessageId, setFocusMessageId] = useState<string | null>(null);

  const { data: selectedConv, isError: convError, isLoading: convLoading } =
    useConversation(selectedConvId);
  const markReadMut = useMarkRead(selectedConvId ?? "");

  // Consume notification / share deep links: /messages?c=&m=
  useEffect(() => {
    const parsed = parseMessagesDeepLink(
      new URLSearchParams(searchParams.toString()),
    );
    if (!parsed.conversationId) return;
    setSelectedConvId(parsed.conversationId);
    setMobilePanel("thread");
    if (parsed.messageId) setFocusMessageId(parsed.messageId);
    router.replace("/messages", { scroll: false });
  }, [searchParams, router]);

  const handleSelectConversation = useCallback(
    (id: string, messageId?: string) => {
      setSelectedConvId(id);
      setMobilePanel("thread");
      if (messageId) setFocusMessageId(messageId);
      if (id !== selectedConvId) {
        void markReadMut.mutate({});
      }
    },
    [markReadMut, selectedConvId],
  );

  function handleLeftConversation() {
    setSelectedConvId(null);
    setShowDetails(false);
    setMobilePanel("list");
    setFocusMessageId(null);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && showDetails) {
        setShowDetails(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showDetails]);

  if (!canRead) {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState
          title="Access denied"
          description="You do not have permission to view messages."
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden border border-border/50 bg-card shadow-sm",
        "-mx-3 -mb-2 -mt-4 h-[calc(100dvh-4.25rem)] rounded-none",
        "sm:-mx-4 sm:-mt-6 sm:h-[calc(100dvh-4.5rem)] sm:rounded-xl",
        "lg:-mx-8 lg:-mt-8 lg:h-[calc(100dvh-5rem)]",
      )}
      role="application"
      aria-label="Messages"
    >
      <div className="md:hidden">
        {mobilePanel === "list" && (
          <PageHeader title="Messages" className="px-4 pt-3 pb-2" />
        )}
        {mobilePanel === "thread" && selectedConv && (
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobilePanel("list")}
              className="h-8 px-2 text-xs"
              aria-label="Back to conversations"
            >
              ← Back
            </Button>
            <span className="flex-1 truncate text-sm font-semibold text-foreground">
              {selectedConv.name ?? "Conversation"}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={() => setShowDetails(true)}
            >
              Details
            </Button>
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside
          className={cn(
            "w-full shrink-0 border-r border-border md:flex md:w-72 md:flex-col xl:w-80",
            mobilePanel === "list" ? "flex" : "hidden",
          )}
          aria-label="Conversation list"
        >
          <ConversationList
            selectedId={selectedConvId}
            onSelect={handleSelectConversation}
            currentUserId={currentUserId}
          />
        </aside>

        <section
          className={cn(
            "min-w-0 flex-1 overflow-hidden md:flex md:flex-col",
            mobilePanel === "thread" ? "flex" : "hidden",
          )}
          aria-label="Conversation thread"
        >
          {selectedConvId === null ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 px-6">
              <EmptyState
                icon={MessageSquare}
                title="Select a conversation"
                description="Choose a conversation from the left panel, or search the workspace."
                className="min-h-0 border-none bg-transparent py-8"
                actionLabel="Search workspace"
                onAction={() => {
                  window.dispatchEvent(
                    new CustomEvent("eliteflow:open-global-search"),
                  );
                }}
              />
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Search className="h-3 w-3" />
                Tip: press{" "}
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                  Ctrl K
                </kbd>{" "}
                to search
              </p>
            </div>
          ) : convError ? (
            <div className="flex h-full items-center justify-center p-6">
              <ErrorState
                title="Conversation not found"
                description="This conversation may have been deleted or you no longer have access."
                retryLabel="Back to list"
                onRetry={handleLeftConversation}
              />
            </div>
          ) : selectedConv ? (
            <ChatThread
              conversation={selectedConv}
              currentUserId={currentUserId}
              detailsOpen={showDetails}
              onToggleDetails={() => setShowDetails((prev) => !prev)}
              focusMessageId={focusMessageId}
              onFocusMessageConsumed={() => setFocusMessageId(null)}
            />
          ) : convLoading && selectedConvId ? (
            <ChatThreadSkeleton />
          ) : (
            <div className="flex flex-1 items-center justify-center p-6">
              <EmptyState
                icon={MessageSquare}
                title="Select a conversation"
                description="Choose a chat from the list to start messaging."
                className="min-h-[220px] border-none bg-transparent"
              />
            </div>
          )}
        </section>

        {showDetails && selectedConvId ? (
          <aside
            className="hidden w-80 shrink-0 flex-col border-l border-border bg-card xl:flex 2xl:w-96"
            aria-label="Conversation details"
          >
            <ConversationDetailsPanel
              conversationId={selectedConvId}
              currentUserId={currentUserId}
              open={true}
              onClose={() => setShowDetails(false)}
              onLeft={handleLeftConversation}
              variant="inline"
            />
          </aside>
        ) : null}
      </div>

      {selectedConvId ? (
        <div className="xl:hidden">
          <ConversationDetailsPanel
            conversationId={selectedConvId}
            currentUserId={currentUserId}
            open={showDetails}
            onClose={() => setShowDetails(false)}
            onLeft={handleLeftConversation}
            variant="sheet"
          />
        </div>
      ) : null}
    </div>
  );
}
