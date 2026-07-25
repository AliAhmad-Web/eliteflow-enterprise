"use client";

import type { MessageDto, MessageReadStatusValue } from "@enterprise/shared";
import {
  Check,
  CheckCheck,
  Copy,
  Edit3,
  Forward,
  MessagesSquare,
  MoreHorizontal,
  Pin,
  PinOff,
  Quote,
  Reply,
  Smile,
  Trash2,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { displayifyMentions } from "../utils/mentions";
import {
  collectMessageLinkedRecords,
  stripLinkMarkers,
} from "../utils/message-linked-records";
import { formatMessageClock } from "../utils/message-content";
import { EmojiPicker } from "./emoji-picker";
import { LinkedRecordCards } from "./linked-record-card";
import { MessageAttachments } from "./message-attachments";
import { MessageBody } from "./message-body";

interface MessageBubbleProps {
  message: MessageDto;
  isOwn: boolean;
  showSender: boolean;
  grouped: boolean;
  canWrite: boolean;
  currentUserId: string;
  deliveryStatus: MessageReadStatusValue;
  editing: boolean;
  editBody: string;
  onEditBodyChange: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  editPending?: boolean;
  emojiOpen: boolean;
  onToggleEmoji: () => void;
  onCloseEmoji: () => void;
  onReply: () => void;
  onQuote: () => void;
  onCopy: () => void;
  onForward: () => void;
  onPin: () => void;
  onUnpin: () => void;
  onStartEdit: () => void;
  onDelete: () => void;
  onReact: (emoji: string) => void;
  onToggleReaction: (emoji: string, mine: boolean) => void;
  replyCount?: number;
  highlighted?: boolean;
  currentUserMentionLabels?: string[];
  onJumpToParent?: () => void;
  onJumpToReplies?: () => void;
  conversationProjectId?: string | null;
  conversationClientId?: string | null;
}

export function MessageBubble({
  message,
  isOwn,
  showSender,
  grouped,
  canWrite,
  currentUserId,
  deliveryStatus,
  editing,
  editBody,
  onEditBodyChange,
  onSaveEdit,
  onCancelEdit,
  editPending,
  emojiOpen,
  onToggleEmoji,
  onCloseEmoji,
  onReply,
  onQuote,
  onCopy,
  onForward,
  onPin,
  onUnpin,
  onStartEdit,
  onDelete,
  onReact,
  onToggleReaction,
  replyCount = 0,
  highlighted = false,
  currentUserMentionLabels = [],
  onJumpToParent,
  onJumpToReplies,
  conversationProjectId = null,
  conversationClientId = null,
}: MessageBubbleProps) {
  const senderName = message.sender
    ? `${message.sender.firstName} ${message.sender.lastName}`
    : "Unknown";
  const initials = `${message.sender?.firstName?.[0] ?? "?"}${message.sender?.lastName?.[0] ?? ""}`.toUpperCase();

  const linkedRecords = collectMessageLinkedRecords({
    body: message.body,
    attachmentFileIds: (message.attachments ?? []).map(
      (attachment) => attachment.managedFileId,
    ),
    conversationProjectId,
    conversationClientId,
  });

  const reactionGroups = Object.entries(
    (message.reactions ?? []).reduce(
      (acc, reaction) => {
        acc[reaction.emoji] = (acc[reaction.emoji] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    ),
  );

  return (
    <div
      id={`message-${message.id}`}
      data-message-id={message.id}
      className={cn(
        "group relative flex gap-2.5 rounded-xl px-1 transition-[background-color,box-shadow] duration-300",
        isOwn ? "flex-row-reverse" : "flex-row",
        grouped ? "mt-0.5" : "mt-3",
        highlighted &&
          "animate-in fade-in zoom-in-95 bg-primary/10 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.35)] duration-500 motion-reduce:animate-none",
      )}
      tabIndex={-1}
    >
      {!isOwn ? (
        <div className={cn("w-8 shrink-0", grouped && "opacity-0")}>
          {showSender ? (
            <Avatar className="h-8 w-8">
              {message.sender?.avatarUrl ? (
                <AvatarImage src={message.sender.avatarUrl} alt={senderName} />
              ) : null}
              <AvatarFallback className="text-[10px] font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
          ) : null}
        </div>
      ) : null}

      <div
        className={cn(
          "flex min-w-0 max-w-[min(78%,36rem)] flex-col",
          isOwn ? "items-end" : "items-start",
        )}
      >
        {showSender && !isOwn ? (
          <p className="mb-1 px-1 text-xs font-semibold text-foreground/80">
            {senderName}
          </p>
        ) : null}

        {message.parent ? (
          <button
            type="button"
            onClick={onJumpToParent}
            className={cn(
              "mb-1 flex max-w-full items-stretch gap-2 rounded-lg border px-2.5 py-1.5 text-left transition-colors",
              isOwn
                ? "border-primary/20 bg-primary/5 hover:bg-primary/10"
                : "border-border bg-muted/50 hover:bg-muted",
            )}
          >
            <span className="w-0.5 shrink-0 rounded-full bg-primary" />
            <span className="min-w-0">
              <span className="block text-[11px] font-semibold text-primary">
                {message.parent.sender
                  ? `${message.parent.sender.firstName} ${message.parent.sender.lastName}`
                  : "Original"}
              </span>
              <span className="line-clamp-2 text-[11px] text-muted-foreground">
                {displayifyMentions(stripLinkMarkers(message.parent.body))}
              </span>
            </span>
          </button>
        ) : null}

        {editing ? (
          <div className="w-full min-w-[220px] space-y-2 rounded-2xl border border-border bg-card p-2.5 shadow-sm">
            <textarea
              className="min-h-[72px] w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
              value={editBody}
              onChange={(event) => onEditBodyChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  onSaveEdit();
                }
                if (event.key === "Escape") onCancelEdit();
              }}
              autoFocus
            />
            <div className="flex justify-end gap-1.5">
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onCancelEdit}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={onSaveEdit}
                disabled={editPending || !editBody.trim()}
              >
                Save
              </Button>
            </div>
          </div>
        ) : (
          <div className="relative">
            <div
              className={cn(
                "rounded-2xl px-3.5 py-2.5 shadow-sm transition-shadow duration-200",
                "group-hover:shadow-md",
                isOwn
                  ? "rounded-br-md bg-primary text-primary-foreground"
                  : "rounded-bl-md border border-border/50 bg-card text-foreground",
                message.isPinned && "ring-2 ring-amber-400/50",
              )}
            >
              {message.isPinned ? (
                <div
                  className={cn(
                    "mb-1.5 flex items-center gap-1 text-[10px] font-medium",
                    isOwn ? "text-primary-foreground/70" : "text-amber-600",
                  )}
                >
                  <Pin className="h-3 w-3" />
                  Pinned
                </div>
              ) : null}

              {message.forwardedFromId ? (
                <p
                  className={cn(
                    "mb-1 text-[10px] font-medium italic",
                    isOwn ? "text-primary-foreground/70" : "text-muted-foreground",
                  )}
                >
                  Forwarded message
                </p>
              ) : null}

              <MessageBody
                body={message.body}
                isOwn={isOwn}
                currentUserMentionLabels={currentUserMentionLabels}
              />

              <LinkedRecordCards
                records={linkedRecords}
                messageId={message.id}
                isOwn={isOwn}
              />

              {(message.attachments?.length ?? 0) > 0 ? (
                <MessageAttachments
                  attachments={message.attachments!}
                  isOwn={isOwn}
                />
              ) : null}

              <div
                className={cn(
                  "mt-1.5 flex items-center gap-1.5 text-[10px]",
                  isOwn
                    ? "justify-end text-primary-foreground/65"
                    : "justify-end text-muted-foreground",
                )}
              >
                {message.isEdited ? <span className="italic">edited</span> : null}
                <span>{formatMessageClock(message.createdAt)}</span>
                {isOwn ? (
                  <DeliveryIcon
                    status={deliveryStatus}
                    reads={message.reads}
                    currentUserId={currentUserId}
                  />
                ) : null}
              </div>
            </div>

            {/* Hover toolbar */}
            <div
              className={cn(
                "absolute -top-3 z-10 flex items-center gap-0.5 rounded-full border border-border bg-popover p-0.5 shadow-md",
                "opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100",
                isOwn ? "right-2" : "left-2",
              )}
            >
              <ToolbarButton title="Reply" onClick={onReply}>
                <Reply className="h-3.5 w-3.5" />
              </ToolbarButton>
              <ToolbarButton title="Quote" onClick={onQuote}>
                <Quote className="h-3.5 w-3.5" />
              </ToolbarButton>
              <ToolbarButton title="React" onClick={onToggleEmoji}>
                <Smile className="h-3.5 w-3.5" />
              </ToolbarButton>
              {canWrite ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="rounded-full p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
                      title="More"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align={isOwn ? "end" : "start"} className="w-44">
                    <DropdownMenuItem onClick={onCopy}>
                      <Copy className="mr-2 h-3.5 w-3.5" />
                      Copy
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onReply}>
                      <Reply className="mr-2 h-3.5 w-3.5" />
                      Reply
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onQuote}>
                      <Quote className="mr-2 h-3.5 w-3.5" />
                      Quote
                    </DropdownMenuItem>
                    {message.parentId && onJumpToParent ? (
                      <DropdownMenuItem onClick={onJumpToParent}>
                        <MessagesSquare className="mr-2 h-3.5 w-3.5" />
                        Jump to original
                      </DropdownMenuItem>
                    ) : null}
                    <DropdownMenuItem onClick={onForward}>
                      <Forward className="mr-2 h-3.5 w-3.5" />
                      Forward
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={message.isPinned ? onUnpin : onPin}>
                      {message.isPinned ? (
                        <PinOff className="mr-2 h-3.5 w-3.5" />
                      ) : (
                        <Pin className="mr-2 h-3.5 w-3.5" />
                      )}
                      {message.isPinned ? "Unpin" : "Pin"}
                    </DropdownMenuItem>
                    {isOwn ? (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={onStartEdit}>
                          <Edit3 className="mr-2 h-3.5 w-3.5" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={onDelete}
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" />
                          Delete
                        </DropdownMenuItem>
                      </>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>

            {emojiOpen ? (
              <div
                className={cn(
                  "absolute z-20 mt-1",
                  isOwn ? "right-0" : "left-0",
                  "top-full",
                )}
              >
                <EmojiPicker
                  onSelect={(emoji) => {
                    onReact(emoji);
                    onCloseEmoji();
                  }}
                />
              </div>
            ) : null}
          </div>
        )}

        {reactionGroups.length > 0 ? (
          <div
            className={cn(
              "mt-1 flex flex-wrap gap-1",
              isOwn ? "justify-end" : "justify-start",
            )}
          >
            {reactionGroups.map(([emoji, count]) => {
              const mine = Boolean(
                message.reactions?.some(
                  (reaction) =>
                    reaction.emoji === emoji && reaction.userId === currentUserId,
                ),
              );
              return (
                <button
                  key={emoji}
                  type="button"
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-all duration-150",
                    mine
                      ? "border-primary/40 bg-primary/10 text-foreground shadow-sm"
                      : "border-border bg-card text-foreground hover:border-primary/30 hover:bg-accent",
                  )}
                  onClick={() => onToggleReaction(emoji, mine)}
                >
                  <span>{emoji}</span>
                  {count > 1 ? (
                    <span className="tabular-nums text-[10px] text-muted-foreground">
                      {count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}

        {replyCount > 0 && onJumpToReplies ? (
          <button
            type="button"
            onClick={onJumpToReplies}
            className={cn(
              "mt-1 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-primary transition hover:bg-accent",
              isOwn ? "self-end" : "self-start",
            )}
          >
            <MessagesSquare className="h-3 w-3" />
            {replyCount} {replyCount === 1 ? "reply" : "replies"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ToolbarButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="rounded-full p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
    >
      {children}
    </button>
  );
}

function DeliveryIcon({
  status,
  reads,
  currentUserId,
}: {
  status: MessageReadStatusValue;
  reads?: MessageDto["reads"];
  currentUserId: string;
}) {
  const others = (reads ?? []).filter((read) => read.userId !== currentUserId);
  const seen = others.filter((read) => read.status === "SEEN");
  const delivered = others.filter((read) => read.status === "DELIVERED");

  let label = "Sent";
  switch (status) {
    case "SENT":
      label = "Sent";
      break;
    case "DELIVERED":
      label =
        delivered.length > 0
          ? `Delivered to ${delivered.length}`
          : "Delivered";
      break;
    case "SEEN":
      label =
        seen.length > 0
          ? `Seen by ${seen.length}${seen.length === 1 ? " person" : " people"}`
          : "Seen";
      break;
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }

  const icon =
    status === "SENT" ? (
      <Check className="h-3 w-3" aria-label={label} />
    ) : (
      <CheckCheck
        className={cn("h-3 w-3", status === "SEEN" && "text-sky-300")}
        aria-label={label}
      />
    );

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex cursor-default">{icon}</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px] text-xs">
          <p className="font-medium">{label}</p>
          {seen.length > 0 ? (
            <p className="mt-1 text-[10px] opacity-80">
              Read receipts update as teammates open the chat.
            </p>
          ) : null}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
