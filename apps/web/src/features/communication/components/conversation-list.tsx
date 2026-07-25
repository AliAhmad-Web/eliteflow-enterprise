"use client";

import type { ConversationDto } from "@enterprise/shared";
import { useVirtualizer } from "@tanstack/react-virtual";
import { MessageSquare, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { EmptyState } from "@/components/common/feedback/empty-state";
import { useIsKeepAlivePageActive } from "@/components/layout/keep-alive-page-active";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useConversationFavorites } from "../hooks/use-conversation-favorites";
import {
  useConversationsInfinite,
  usePresence,
} from "../hooks/use-communication";
import { communicationService } from "../services/communication.service";
import {
  buildGroupedSidebarRows,
  getPeerUser,
  matchesConversationSearch,
  subscribeConversationLastSenders,
} from "../utils/conversation-sidebar";
import {
  buildPresenceMap,
  formatLastSeen,
  formatTypingLabel,
  onlineUserIds,
} from "../utils/presence";
import { ConversationListItem } from "./conversation-list-item";
import { ConversationListSkeleton } from "./communication-skeletons";
import { GlobalSearchDialog } from "./global-search-dialog";
import { NewConversationDialog } from "./new-conversation-dialog";

interface ConversationListProps {
  selectedId: string | null;
  onSelect: (id: string, messageId?: string) => void;
  currentUserId?: string;
}

export function ConversationList({
  selectedId,
  onSelect,
  currentUserId,
}: ConversationListProps) {
  const [search, setSearch] = useState("");
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [, setSenderTick] = useState(0);
  // RC#5: pause auto-pagination + heartbeat while this page is keep-alive-hidden.
  const pageActive = useIsKeepAlivePageActive();

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useConversationsInfinite(true);
  const showInitialLoading = isLoading && !data;

  const { isFavorite, toggleFavorite } = useConversationFavorites();
  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return subscribeConversationLastSenders(() => {
      setSenderTick((value) => value + 1);
    });
  }, []);

  useEffect(() => {
    if (!pageActive) return;
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [pageActive, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const conversations = useMemo(() => {
    const map = new Map<string, ConversationDto>();
    for (const page of data?.pages ?? []) {
      for (const item of page.items) {
        map.set(item.id, item);
      }
    }
    return [...map.values()];
  }, [data?.pages]);

  const filtered = useMemo(
    () =>
      conversations.filter((conv) =>
        matchesConversationSearch(conv, search, currentUserId),
      ),
    [conversations, search, currentUserId],
  );

  const rows = useMemo(
    () => buildGroupedSidebarRows(filtered, isFavorite),
    [filtered, isFavorite],
  );

  const memberUserIds = useMemo(() => {
    const ids = new Set<string>();
    for (const conv of conversations) {
      for (const member of conv.members ?? []) {
        if (member.userId && member.userId !== currentUserId) {
          ids.add(member.userId);
        }
      }
    }
    return [...ids].sort();
  }, [conversations, currentUserId]);

  const memberOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const conv of conversations) {
      for (const member of conv.members ?? []) {
        if (!member.user) continue;
        map.set(
          member.userId,
          `${member.user.firstName} ${member.user.lastName}`.trim(),
        );
      }
    }
    if (currentUserId && !map.has(currentUserId)) {
      map.set(currentUserId, "You");
    }
    return [...map.entries()]
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [conversations, currentUserId]);

  const { data: presenceList } = usePresence(
    memberUserIds,
    memberUserIds.length > 0 && pageActive,
  );
  const presenceByUserId = useMemo(
    () => buildPresenceMap(presenceList),
    [presenceList],
  );
  const presenceOnlineIds = useMemo(
    () => onlineUserIds(presenceList),
    [presenceList],
  );

  useEffect(() => {
    if (!pageActive) {
      return;
    }

    void communicationService.heartbeat().catch(() => undefined);
    const id = window.setInterval(() => {
      void communicationService.heartbeat().catch(() => undefined);
    }, 20_000);

    function onVisibility() {
      if (document.visibilityState === "visible") {
        void communicationService.heartbeat().catch(() => undefined);
      } else {
        void communicationService.setOffline().catch(() => undefined);
      }
    }

    function onUnload() {
      void communicationService.setOffline().catch(() => undefined);
    }

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onUnload);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onUnload);
      // Do not setOffline on keep-alive hide — user may still be in the app.
    };
  }, [pageActive]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setGlobalSearchOpen(true);
      }
    }
    function onOpenSearch() {
      setGlobalSearchOpen(true);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("eliteflow:open-global-search", onOpenSearch);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("eliteflow:open-global-search", onOpenSearch);
    };
  }, []);

  const typingByConversation = useMemo(() => {
    const map = new Map<string, string>();
    const nameByUserId = new Map<string, string>();

    for (const conv of conversations) {
      for (const member of conv.members ?? []) {
        if (!member.user || member.userId === currentUserId) continue;
        nameByUserId.set(
          member.userId,
          member.user.firstName || member.user.lastName || "Someone",
        );
      }
    }

    const namesByConv = new Map<string, string[]>();
    for (const row of presenceList ?? []) {
      if (!row.typingConversationId || row.userId === currentUserId) continue;
      const name = nameByUserId.get(row.userId) ?? "Someone";
      const list = namesByConv.get(row.typingConversationId) ?? [];
      list.push(name);
      namesByConv.set(row.typingConversationId, list);
    }

    for (const [conversationId, names] of namesByConv) {
      const label = formatTypingLabel(names);
      if (label) map.set(conversationId, label);
    }

    return map;
  }, [conversations, presenceList, currentUserId]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => (rows[index]?.kind === "header" ? 32 : 68),
    overscan: 10,
  });

  // Arrow-key navigation across visible conversation rows
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      const conversationIndexes = rows
        .map((row, index) => (row.kind === "conversation" ? index : -1))
        .filter((index) => index >= 0);
      if (conversationIndexes.length === 0) return;

      const currentIndex = selectedId
        ? rows.findIndex(
            (row) => row.kind === "conversation" && row.id === selectedId,
          )
        : -1;
      const position = conversationIndexes.indexOf(currentIndex);
      const nextPosition =
        event.key === "ArrowDown"
          ? Math.min(
              conversationIndexes.length - 1,
              Math.max(0, position) + (position >= 0 ? 1 : 0),
            )
          : Math.max(0, (position >= 0 ? position : conversationIndexes.length) - 1);
      const nextRowIndex = conversationIndexes[nextPosition];
      const nextRow = nextRowIndex != null ? rows[nextRowIndex] : null;
      if (!nextRow || nextRow.kind !== "conversation") return;

      event.preventDefault();
      onSelect(nextRow.conversation.id);
      virtualizer.scrollToIndex(nextRowIndex, { align: "auto" });
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [rows, selectedId, onSelect, virtualizer]);

  useEffect(() => {
    if (!selectedId) return;
    const index = rows.findIndex(
      (row) => row.kind === "conversation" && row.id === selectedId,
    );
    if (index >= 0) {
      virtualizer.scrollToIndex(index, { align: "auto" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [selectedId]);

  const totalCount = conversations.length;
  const visibleCount = filtered.length;

  return (
    <div className="flex h-full flex-col border-r border-border bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Messages
          </h2>
          <p className="text-[11px] text-muted-foreground">
            {showInitialLoading
              ? "Loading conversations…"
              : search.trim()
                ? `${visibleCount} of ${totalCount}`
                : `${totalCount} conversation${totalCount === 1 ? "" : "s"}`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-xs"
            title="Search workspace (Ctrl+K)"
            aria-label="Search workspace"
            onClick={() => setGlobalSearchOpen(true)}
          >
            <Search className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-2.5 text-xs"
            onClick={() => setNewDialogOpen(true)}
            aria-label="Start a new conversation"
          >
            <MessageSquare className="mr-1 h-3.5 w-3.5" />
            New
          </Button>
        </div>
      </div>

      <div className="border-b border-border px-3 py-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Filter conversations"
            className="h-8 pl-8 text-xs"
            aria-label="Filter conversations"
          />
        </div>
        <button
          type="button"
          className="mt-2 w-full rounded-md border border-dashed border-border px-2 py-1.5 text-left text-[11px] text-muted-foreground transition hover:bg-accent hover:text-foreground"
          onClick={() => setGlobalSearchOpen(true)}
        >
          Search messages, people, files…{" "}
          <kbd className="ml-1 rounded border border-border bg-muted px-1 text-[10px]">
            Ctrl K
          </kbd>
        </button>
      </div>

      <div
        ref={parentRef}
        className="min-h-0 flex-1 overflow-y-auto"
        role="listbox"
        aria-label="Conversations"
        aria-activedescendant={selectedId ? `conversation-${selectedId}` : undefined}
      >
        {showInitialLoading ? (
          <ConversationListSkeleton />
        ) : rows.length === 0 ? (
          <EmptyState
            title={search.trim() ? "No matches" : "No conversations"}
            description={
              search.trim()
                ? "Try a different filter, or open global search."
                : "Start a new conversation to begin messaging."
            }
            actionLabel={search.trim() ? undefined : "New conversation"}
            onAction={search.trim() ? undefined : () => setNewDialogOpen(true)}
            className="m-3 min-h-[220px] border-none bg-transparent"
          />
        ) : (
          <div
            className="relative w-full"
            style={{ height: virtualizer.getTotalSize() }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index];
              if (!row) return null;

              if (row.kind === "header") {
                return (
                  <div
                    key={row.id}
                    className="absolute left-0 top-0 w-full"
                    style={{
                      height: virtualRow.size,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {row.label}
                    </p>
                  </div>
                );
              }

              const peer = getPeerUser(row.conversation, currentUserId);
              const peerPresence = peer
                ? presenceByUserId.get(peer.userId)
                : undefined;
              const presenceLabel =
                row.conversation.type === "DIRECT"
                  ? formatLastSeen(peerPresence)
                  : null;

              return (
                <div
                  key={row.id}
                  className="absolute left-0 top-0 w-full"
                  style={{
                    height: virtualRow.size,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <ConversationListItem
                    conversation={row.conversation}
                    selected={selectedId === row.conversation.id}
                    currentUserId={currentUserId}
                    isFavorite={isFavorite(row.conversation.id)}
                    isTyping={typingByConversation.has(row.conversation.id)}
                    typingLabel={
                      typingByConversation.get(row.conversation.id) ?? null
                    }
                    presenceOnlineIds={presenceOnlineIds}
                    presenceLabel={presenceLabel}
                    onSelect={onSelect}
                    onToggleFavorite={toggleFavorite}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <NewConversationDialog
        open={newDialogOpen}
        onOpenChange={setNewDialogOpen}
        onCreated={(id) => onSelect(id)}
      />

      <GlobalSearchDialog
        open={globalSearchOpen}
        onOpenChange={setGlobalSearchOpen}
        currentUserId={currentUserId ?? ""}
        memberOptions={memberOptions}
        onOpenConversation={onSelect}
      />
    </div>
  );
}
