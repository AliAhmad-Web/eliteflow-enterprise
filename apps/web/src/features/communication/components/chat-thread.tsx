"use client";

import type { ConversationDto, MessageDto, MessageReadStatusValue } from "@enterprise/shared";
import { PERMISSIONS } from "@enterprise/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { EmptyState } from "@/components/common/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { useHasPermission } from "@/features/rbac/hooks/use-permissions";

import { useMessagesInfinite, usePresence } from "../hooks/use-communication";
import {
  useDeleteMessage,
  useForwardMessage,
  usePinMessage,
  useReactToMessage,
  useUnpinMessage,
  useUnreactToMessage,
} from "../hooks/use-communication-mutations";
import { communicationService } from "../services/communication.service";
import { setConversationLastSender } from "../utils/conversation-sidebar";
import {
  buildQuoteBlock,
  displayifyMentions,
  formatMentionLabel,
} from "../utils/mentions";
import { stripLinkMarkers } from "../utils/message-linked-records";
import {
  formatDateSeparator,
  isSameCalendarDay,
  shouldGroupWithPrevious,
} from "../utils/message-content";
import {
  buildPresenceMap,
  formatTypingLabel,
  onlineUserIds,
} from "../utils/presence";
import { ChatHeader } from "./chat-header";
import { ChatThreadSkeleton } from "./communication-skeletons";
import { ForwardMessageDialog } from "./forward-message-dialog";
import { MessageBubble } from "./message-bubble";
import { MessageComposer } from "./message-composer";
import { TypingIndicator } from "./typing-indicator";

interface ChatThreadProps {
  conversation: ConversationDto;
  currentUserId: string;
  detailsOpen?: boolean;
  onToggleDetails?: () => void;
  focusMessageId?: string | null;
  onFocusMessageConsumed?: () => void;
}

type ThreadItem =
  | { kind: "date"; id: string; label: string }
  | { kind: "unread"; id: string }
  | {
      kind: "message";
      id: string;
      message: MessageDto;
      showSender: boolean;
      grouped: boolean;
    };

export function ChatThread({
  conversation,
  currentUserId,
  detailsOpen = false,
  onToggleDetails,
  focusMessageId = null,
  onFocusMessageConsumed,
}: ChatThreadProps) {
  const canWrite = useHasPermission(PERMISSIONS.CHAT_WRITE);
  const conversationId = conversation.id;

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useMessagesInfinite(conversationId, 50, true);
  const showInitialLoading = isLoading && !data;

  const memberIds = useMemo(
    () =>
      (conversation.members ?? [])
        .map((member) => member.userId)
        .filter((id) => id !== currentUserId),
    [conversation.members, currentUserId],
  );
  const { data: presenceList } = usePresence(memberIds, memberIds.length > 0);
  const presenceByUserId = useMemo(
    () => buildPresenceMap(presenceList),
    [presenceList],
  );
  const onlineIds = useMemo(() => onlineUserIds(presenceList), [presenceList]);

  const typingLabel = useMemo(() => {
    const names: string[] = [];
    for (const row of presenceList ?? []) {
      if (row.typingConversationId !== conversationId) continue;
      if (row.userId === currentUserId) continue;
      const member = conversation.members?.find((m) => m.userId === row.userId);
      const name =
        member?.user?.firstName ||
        member?.user?.lastName ||
        "Someone";
      names.push(name);
    }
    return formatTypingLabel(names);
  }, [presenceList, conversationId, conversation.members, currentUserId]);

  const deleteMut = useDeleteMessage(conversationId);
  const pinMut = usePinMessage(conversationId);
  const unpinMut = useUnpinMessage(conversationId);
  const reactMut = useReactToMessage(conversationId);
  const unreactMut = useUnreactToMessage(conversationId);
  const forwardMut = useForwardMessage(conversationId);

  const [replyTo, setReplyTo] = useState<MessageDto | null>(null);
  const [editingMessage, setEditingMessage] = useState<MessageDto | null>(null);
  const [emojiTargetId, setEmojiTargetId] = useState<string | null>(null);
  const [forwardMessage, setForwardMessage] = useState<MessageDto | null>(null);
  const [pendingQuote, setPendingQuote] = useState<{
    id: string;
    text: string;
  } | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(
    null,
  );

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const previousCountRef = useRef(0);
  const previousScrollHeightRef = useRef(0);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const messages: MessageDto[] = useMemo(() => {
    const allPages = data?.pages ?? [];
    return allPages
      .slice()
      .reverse()
      .flatMap((page) => [...page.items].reverse());
  }, [data?.pages]);

  const replyCountById = useMemo(() => {
    const counts = new Map<string, number>();
    for (const message of messages) {
      if (!message.parentId) continue;
      counts.set(message.parentId, (counts.get(message.parentId) ?? 0) + 1);
    }
    return counts;
  }, [messages]);

  const firstReplyByParentId = useMemo(() => {
    const map = new Map<string, string>();
    for (const message of messages) {
      if (!message.parentId || map.has(message.parentId)) continue;
      map.set(message.parentId, message.id);
    }
    return map;
  }, [messages]);

  const jumpToMessage = useCallback((messageId: string) => {
    const el = document.getElementById(`message-${messageId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedMessageId(messageId);
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => {
      setHighlightedMessageId(null);
    }, 1800);
  }, []);

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!focusMessageId) return;
    const exists = messages.some((message) => message.id === focusMessageId);
    if (!exists) return;
    jumpToMessage(focusMessageId);
    onFocusMessageConsumed?.();
  }, [focusMessageId, messages, jumpToMessage, onFocusMessageConsumed]);

  const myMember = conversation.members?.find((m) => m.userId === currentUserId);
  const lastReadAt = myMember?.lastReadAt ?? null;

  const unreadDividerIndex = useMemo(() => {
    if (!lastReadAt) return -1;
    const readTime = new Date(lastReadAt).getTime();
    return messages.findIndex(
      (msg) =>
        msg.senderId !== currentUserId &&
        new Date(msg.createdAt).getTime() > readTime,
    );
  }, [messages, lastReadAt, currentUserId]);

  const threadItems: ThreadItem[] = useMemo(() => {
    const items: ThreadItem[] = [];

    messages.forEach((message, index) => {
      const previous = messages[index - 1];
      const showDate =
        !previous || !isSameCalendarDay(previous.createdAt, message.createdAt);

      if (showDate) {
        items.push({
          kind: "date",
          id: `date:${message.createdAt.slice(0, 10)}`,
          label: formatDateSeparator(message.createdAt),
        });
      }

      if (index === unreadDividerIndex) {
        items.push({ kind: "unread", id: "unread-divider" });
      }

      const grouped = shouldGroupWithPrevious(message, previous);
      items.push({
        kind: "message",
        id: message.id,
        message,
        showSender: !grouped && message.senderId !== currentUserId,
        grouped,
      });
    });

    return items;
  }, [messages, unreadDividerIndex, currentUserId]);

  // Track whether the user is near the bottom for smart auto-scroll.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    function onScroll() {
      const node = scrollRef.current;
      if (!node) return;
      const distance = node.scrollHeight - node.scrollTop - node.clientHeight;
      stickToBottomRef.current = distance < 80;
    }

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Preserve scroll position when loading older messages; otherwise smooth-scroll.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const previousCount = previousCountRef.current;
    const nextCount = messages.length;

    if (nextCount > previousCount && previousCount > 0 && !stickToBottomRef.current) {
      const delta = el.scrollHeight - previousScrollHeightRef.current;
      if (delta > 0) {
        el.scrollTop += delta;
      }
    } else if (
      nextCount > previousCount &&
      (stickToBottomRef.current || previousCount === 0)
    ) {
      bottomRef.current?.scrollIntoView({
        behavior: previousCount === 0 ? "auto" : "smooth",
      });
    }

    previousCountRef.current = nextCount;
    previousScrollHeightRef.current = el.scrollHeight;
  }, [messages.length, threadItems.length]);

  useEffect(() => {
    const latest = messages[messages.length - 1];
    if (!latest) return;
    const senderName = latest.sender
      ? `${latest.sender.firstName} ${latest.sender.lastName}`.trim()
      : latest.senderId === currentUserId
        ? "You"
        : "Someone";
    setConversationLastSender(conversationId, {
      senderId: latest.senderId,
      senderName:
        latest.senderId === currentUserId
          ? "You"
          : (senderName.split(" ")[0] ?? senderName),
      preview: stripLinkMarkers(displayifyMentions(latest.body)),
    });
  }, [messages, conversationId, currentUserId]);

  function handleTyping(isTyping: boolean) {
    void communicationService
      .setTyping(conversationId, { isTyping })
      .catch(() => undefined);
  }

  function getDeliveryStatus(msg: MessageDto): MessageReadStatusValue {
    const ownReads = msg.reads?.filter((r) => r.userId !== currentUserId) ?? [];
    if (ownReads.some((r) => r.status === "SEEN")) return "SEEN";
    if (ownReads.some((r) => r.status === "DELIVERED")) return "DELIVERED";
    return "SENT";
  }

  const memberSuggestions = (conversation.members ?? [])
    .filter((m) => m.userId !== currentUserId)
    .map((m) => ({
      id: m.userId,
      firstName: m.user?.firstName ?? "",
      lastName: m.user?.lastName ?? "",
    }));

  const currentUserMentionLabels = useMemo(() => {
    const me = conversation.members?.find((m) => m.userId === currentUserId)?.user;
    if (!me) return [];
    const peers = (conversation.members ?? [])
      .filter((m) => m.user)
      .map((m) => ({
        id: m.userId,
        firstName: m.user!.firstName,
        lastName: m.user!.lastName,
      }));
    return [
      formatMentionLabel(
        { id: currentUserId, firstName: me.firstName, lastName: me.lastName },
        peers,
      ),
    ];
  }, [conversation.members, currentUserId]);

  return (
    <div className="flex h-full flex-col bg-background">
      <ChatHeader
        conversation={conversation}
        currentUserId={currentUserId}
        presenceByUserId={presenceByUserId}
        typingLabel={typingLabel}
        onlineCount={onlineIds.size}
        detailsOpen={detailsOpen}
        onToggleDetails={() => onToggleDetails?.()}
      />

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-3 md:px-5"
        onClick={() => setEmojiTargetId(null)}
      >
        {hasNextPage ? (
          <div className="mb-3 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                const el = scrollRef.current;
                previousScrollHeightRef.current = el?.scrollHeight ?? 0;
                stickToBottomRef.current = false;
                void fetchNextPage();
              }}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? "Loading…" : "Load older messages"}
            </Button>
          </div>
        ) : null}

        {showInitialLoading ? (
          <div className="flex flex-1 items-center justify-center px-4 py-10">
            <ChatThreadSkeleton className="w-full max-w-2xl" />
          </div>
        ) : null}

        {!showInitialLoading && messages.length === 0 ? (
          <EmptyState
            title="No messages yet"
            description="Say hello — this is the start of the conversation."
            className="mx-auto min-h-[220px] max-w-md border-none bg-transparent"
          />
        ) : null}

        {threadItems.map((item) => {
          if (item.kind === "date") {
            return (
              <div key={item.id} className="my-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="rounded-full border border-border bg-card px-3 py-0.5 text-[11px] font-medium text-muted-foreground shadow-sm">
                  {item.label}
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
            );
          }

          if (item.kind === "unread") {
            return (
              <div key={item.id} className="my-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-destructive/40" />
                <span className="text-[11px] font-semibold uppercase tracking-wide text-destructive">
                  New messages
                </span>
                <div className="h-px flex-1 bg-destructive/40" />
              </div>
            );
          }

          const msg = item.message;
          const isOwn = msg.senderId === currentUserId;

          const parentId = msg.parentId ?? msg.parent?.id ?? null;
          const replyCount = replyCountById.get(msg.id) ?? 0;
          const firstReplyId = firstReplyByParentId.get(msg.id);

          return (
            <MessageBubble
              key={item.id}
              message={msg}
              isOwn={isOwn}
              showSender={item.showSender}
              grouped={item.grouped}
              canWrite={canWrite}
              currentUserId={currentUserId}
              deliveryStatus={getDeliveryStatus(msg)}
              editing={false}
              editBody=""
              onEditBodyChange={() => undefined}
              onSaveEdit={() => undefined}
              onCancelEdit={() => undefined}
              editPending={false}
              emojiOpen={emojiTargetId === msg.id}
              onToggleEmoji={() =>
                setEmojiTargetId((prev) => (prev === msg.id ? null : msg.id))
              }
              onCloseEmoji={() => setEmojiTargetId(null)}
              replyCount={replyCount}
              highlighted={highlightedMessageId === msg.id}
              currentUserMentionLabels={currentUserMentionLabels}
              conversationProjectId={conversation.projectId}
              conversationClientId={conversation.clientId}
              onJumpToParent={
                parentId ? () => jumpToMessage(parentId) : undefined
              }
              onJumpToReplies={
                firstReplyId ? () => jumpToMessage(firstReplyId) : undefined
              }
              onReply={() => {
                setEditingMessage(null);
                setReplyTo(msg);
              }}
              onQuote={() => {
                setEditingMessage(null);
                setReplyTo(msg);
                const author = msg.sender
                  ? `${msg.sender.firstName} ${msg.sender.lastName}`
                  : undefined;
                setPendingQuote({
                  id: crypto.randomUUID(),
                  text: buildQuoteBlock(msg.body, author),
                });
              }}
              onCopy={() => {
                void navigator.clipboard.writeText(
                  stripLinkMarkers(displayifyMentions(msg.body)),
                );
              }}
              onForward={() => setForwardMessage(msg)}
              onPin={() => void pinMut.mutate(msg.id)}
              onUnpin={() => void unpinMut.mutate(msg.id)}
              onStartEdit={() => {
                setReplyTo(null);
                setEditingMessage(msg);
              }}
              onDelete={() => {
                if (window.confirm("Delete this message?")) {
                  void deleteMut.mutate(msg.id);
                }
              }}
              onReact={(emoji) => {
                void reactMut.mutate({ messageId: msg.id, input: { emoji } });
              }}
              onToggleReaction={(emoji, mine) => {
                if (mine) {
                  void unreactMut.mutate({ messageId: msg.id, emoji });
                } else {
                  void reactMut.mutate({
                    messageId: msg.id,
                    input: { emoji },
                  });
                }
              }}
            />
          );
        })}

        <div ref={bottomRef} className="h-3" />
      </div>

      <div className="border-t border-border/50 px-3 py-1.5">
        <TypingIndicator label={typingLabel} />
      </div>

      <MessageComposer
        conversationId={conversationId}
        replyTo={replyTo}
        onClearReply={() => setReplyTo(null)}
        editingMessage={editingMessage}
        onCancelEdit={() => setEditingMessage(null)}
        onEdited={() => setEditingMessage(null)}
        memberSuggestions={memberSuggestions}
        pendingQuote={pendingQuote?.text ?? null}
        pendingQuoteKey={pendingQuote?.id ?? null}
        onConsumeQuote={() => setPendingQuote(null)}
        onTyping={handleTyping}
        onSent={() => {
          stickToBottomRef.current = true;
          requestAnimationFrame(() => {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
          });
        }}
      />

      <ForwardMessageDialog
        open={Boolean(forwardMessage)}
        onOpenChange={(open) => {
          if (!open) setForwardMessage(null);
        }}
        sourceConversationId={conversationId}
        currentUserId={currentUserId}
        isPending={forwardMut.isPending}
        onForward={(targetConversationId) => {
          if (!forwardMessage) return;
          void forwardMut
            .mutateAsync({
              messageId: forwardMessage.id,
              input: { targetConversationId },
            })
            .then(() => setForwardMessage(null));
        }}
      />
    </div>
  );
}
