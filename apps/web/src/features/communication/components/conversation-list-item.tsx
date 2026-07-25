"use client";

import type { ConversationDto } from "@enterprise/shared";
import { BellOff, Pin, PinOff } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import {
  formatSidebarTimestamp,
  getConversationAvatarUrl,
  getConversationDisplayName,
  getConversationInitials,
  getConversationLastSender,
  getPeerUser,
  isConversationMuted,
  isConversationOnline,
} from "../utils/conversation-sidebar";
import { displayifyMentions } from "../utils/mentions";
import { stripLinkMarkers } from "../utils/message-linked-records";

interface ConversationListItemProps {
  conversation: ConversationDto;
  selected: boolean;
  currentUserId?: string;
  isFavorite: boolean;
  isTyping: boolean;
  typingLabel: string | null;
  presenceOnlineIds?: Set<string>;
  /** Slack-style last seen / active label for DMs */
  presenceLabel?: string | null;
  onSelect: (id: string, messageId?: string) => void;
  onToggleFavorite: (id: string) => void;
}

export function ConversationListItem({
  conversation,
  selected,
  currentUserId,
  isFavorite,
  isTyping,
  typingLabel,
  presenceOnlineIds,
  presenceLabel = null,
  onSelect,
  onToggleFavorite,
}: ConversationListItemProps) {
  const displayName = getConversationDisplayName(conversation, currentUserId);
  const avatarUrl = getConversationAvatarUrl(conversation, currentUserId);
  const initials = getConversationInitials(conversation, currentUserId);
  const online = isConversationOnline(
    conversation,
    currentUserId,
    presenceOnlineIds,
  );
  const muted = isConversationMuted(conversation, currentUserId);
  const unread = conversation.unreadCount ?? 0;
  const lastSender = getConversationLastSender(conversation.id);
  const peer = getPeerUser(conversation, currentUserId);

  const senderName =
    lastSender?.senderName ??
    (unread > 0 && peer?.user ? peer.user.firstName : null);

  const previewText =
    stripLinkMarkers(
      displayifyMentions(conversation.lastMessagePreview?.trim() || ""),
    ) || "No messages yet";
  const timestamp = formatSidebarTimestamp(conversation.lastMessageAt);

  return (
    <div
      id={`conversation-${conversation.id}`}
      role="option"
      tabIndex={0}
      data-selected={selected ? "true" : "false"}
      aria-selected={selected}
      aria-label={`${displayName}${unread > 0 ? `, ${unread} unread` : ""}`}
      onClick={() => onSelect(conversation.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(conversation.id);
        }
      }}
      className={cn(
        "group relative mx-1.5 flex cursor-pointer items-start gap-3 rounded-lg border border-transparent px-2.5 py-2.5 text-left outline-none transition-all duration-200",
        "hover:bg-accent/70 hover:shadow-sm",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        selected &&
          "border-primary/20 bg-primary/10 shadow-sm hover:bg-primary/15 data-[selected=true]:bg-primary/10",
        unread > 0 && !selected && "bg-accent/30",
      )}
    >
      <div className="relative mt-0.5 shrink-0">
        <Avatar className="h-10 w-10 border-border/80">
          {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
          <AvatarFallback className="bg-muted text-xs font-semibold tracking-wide">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card",
            online ? "bg-emerald-500" : "bg-muted-foreground/40",
          )}
          title={online ? "Online" : "Offline"}
          aria-label={online ? "Online" : "Offline"}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-[13px] leading-5 text-foreground",
              unread > 0 ? "font-semibold" : "font-medium",
            )}
            title={
              conversation.type === "DIRECT" && presenceLabel
                ? presenceLabel
                : undefined
            }
          >
            {displayName}
          </span>

          <div className="flex shrink-0 items-center gap-1 text-muted-foreground">
            {isFavorite ? (
              <Pin className="h-3 w-3 fill-current text-amber-500" aria-label="Pinned" />
            ) : null}
            {muted ? (
              <BellOff className="h-3 w-3" aria-label="Muted" />
            ) : null}
            {timestamp ? (
              <span
                className={cn(
                  "text-[11px] tabular-nums",
                  unread > 0 ? "font-medium text-primary" : "text-muted-foreground",
                )}
              >
                {timestamp}
              </span>
            ) : null}
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "rounded-md p-0.5 opacity-0 transition-opacity duration-150",
                      "hover:bg-background/80 group-hover:opacity-100 focus-visible:opacity-100",
                      isFavorite && "opacity-100",
                    )}
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleFavorite(conversation.id);
                    }}
                    aria-label={isFavorite ? "Unpin conversation" : "Pin conversation"}
                  >
                    {isFavorite ? (
                      <PinOff className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <Pin className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  {isFavorite ? "Remove from favorites" : "Add to favorites"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <div className="mt-0.5 flex items-center gap-2">
          <p
            className={cn(
              "min-w-0 flex-1 truncate text-xs leading-4",
              isTyping
                ? "font-medium italic text-primary"
                : unread > 0
                  ? "text-foreground/80"
                  : "text-muted-foreground",
            )}
          >
            {isTyping && typingLabel ? (
              typingLabel
            ) : senderName && conversation.lastMessagePreview ? (
              <>
                <span className="font-medium text-foreground/70">{senderName}: </span>
                {previewText}
              </>
            ) : (
              previewText
            )}
          </p>

          {unread > 0 ? (
            <Badge
              variant="default"
              className="h-5 min-w-5 shrink-0 justify-center rounded-full px-1.5 text-[10px] font-semibold"
            >
              {unread > 99 ? "99+" : unread}
            </Badge>
          ) : null}
        </div>
      </div>
    </div>
  );
}
