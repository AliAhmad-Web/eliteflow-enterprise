"use client";

import type { AiConversation } from "@enterprise/shared";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { maybeMemo } from "@/features/performance";
import { cn } from "@/lib/utils";

export interface AiConversationListItemProps {
  conversation: AiConversation;
  selected: boolean;
  onSelect: (id: string) => void;
  onDelete: (conversation: AiConversation) => void;
}

function AiConversationListItemComponent({
  conversation,
  selected,
  onSelect,
  onDelete,
}: AiConversationListItemProps) {
  return (
    <div
      className={cn(
        "group flex items-start gap-1 rounded-xl border border-transparent px-2.5 py-2.5 transition-colors hover:bg-accent/50",
        selected && "border-primary/20 bg-primary/5 shadow-(--shadow-xs)",
      )}
    >
      <button
        type="button"
        className="min-w-0 flex-1 text-left"
        onClick={() => onSelect(conversation.id)}
      >
        <p className="truncate text-sm font-medium text-foreground">
          {conversation.title}
        </p>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
          {conversation.preview ?? "No messages yet"}
        </p>
      </button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
        aria-label={`Delete ${conversation.title}`}
        onClick={() => {
          onDelete(conversation);
        }}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export const AiConversationListItem = maybeMemo(
  AiConversationListItemComponent,
);
