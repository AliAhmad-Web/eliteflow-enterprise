"use client";

import type { ConversationDto, UserPresenceDto } from "@enterprise/shared";
import { Info } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
  getConversationAvatarUrl,
  getConversationDisplayName,
  getConversationInitials,
  getPeerUser,
} from "../utils/conversation-sidebar";
import { formatLastSeen } from "../utils/presence";
import { TypingIndicator } from "./typing-indicator";

interface ChatHeaderProps {
  conversation: ConversationDto;
  currentUserId: string;
  presenceByUserId: Map<string, UserPresenceDto>;
  typingLabel: string | null;
  onlineCount: number;
  onToggleDetails: () => void;
  detailsOpen: boolean;
}

export function ChatHeader({
  conversation,
  currentUserId,
  presenceByUserId,
  typingLabel,
  onlineCount,
  onToggleDetails,
  detailsOpen,
}: ChatHeaderProps) {
  const title = getConversationDisplayName(conversation, currentUserId);
  const avatarUrl = getConversationAvatarUrl(conversation, currentUserId);
  const initials = getConversationInitials(conversation, currentUserId);
  const peer = getPeerUser(conversation, currentUserId);
  const isDirect = conversation.type === "DIRECT";
  const peerPresence = peer ? presenceByUserId.get(peer.userId) : undefined;
  const peerOnline = Boolean(peerPresence?.isOnline);

  const statusLine = typingLabel
    ? null
    : isDirect
      ? formatLastSeen(peerPresence)
      : `${conversation.memberCount ?? conversation.members?.length ?? 0} members · ${onlineCount} online`;

  return (
    <div className="flex items-center gap-3 border-b border-border bg-card/50 px-4 py-2.5 backdrop-blur-sm">
      <div className="relative shrink-0">
        <Avatar className="h-9 w-9">
          {avatarUrl ? <AvatarImage src={avatarUrl} alt={title} /> : null}
          <AvatarFallback className="text-[11px] font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        {isDirect ? (
          <span
            className={cn(
              "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card",
              peerOnline ? "bg-emerald-500" : "bg-muted-foreground/40",
            )}
            title={peerOnline ? "Online" : "Offline"}
            aria-label={peerOnline ? "Online" : "Offline"}
          />
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold tracking-tight text-foreground">
          {title}
        </p>
        {typingLabel ? (
          <TypingIndicator label={typingLabel} className="mt-0.5 px-0" />
        ) : (
          <p
            className={cn(
              "truncate text-[11px]",
              isDirect && peerOnline
                ? "text-emerald-600"
                : "text-muted-foreground",
            )}
          >
            {statusLine}
          </p>
        )}
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="hidden h-8 gap-1.5 text-xs text-muted-foreground md:inline-flex"
        onClick={onToggleDetails}
        aria-pressed={detailsOpen}
        aria-label={detailsOpen ? "Hide conversation details" : "Show conversation details"}
      >
        <Info className="h-3.5 w-3.5" />
        {detailsOpen ? "Hide details" : "Details"}
      </Button>
    </div>
  );
}
