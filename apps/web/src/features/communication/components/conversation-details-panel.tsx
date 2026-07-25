"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { ConversationDetailsContent } from "./conversation-details-content";

interface ConversationDetailsPanelProps {
  conversationId: string;
  currentUserId?: string;
  open: boolean;
  onClose: () => void;
  onLeft?: () => void;
  /** Desktop column uses inline; mobile uses sheet overlay. */
  variant?: "sheet" | "inline";
}

export function ConversationDetailsPanel({
  conversationId,
  currentUserId,
  open,
  onClose,
  onLeft,
  variant = "sheet",
}: ConversationDetailsPanelProps) {
  if (variant === "inline") {
    if (!open) return null;
    return (
      <ConversationDetailsContent
        conversationId={conversationId}
        currentUserId={currentUserId}
        onClose={onClose}
        onLeft={onLeft}
        className="h-full"
      />
    );
  }

  return (
    <Sheet open={open} onOpenChange={(value) => !value && onClose()}>
      <SheetContent side="right" className="w-full max-w-md p-0 sm:max-w-md">
        <SheetHeader className="sr-only">
          <SheetTitle>Conversation details</SheetTitle>
        </SheetHeader>
        <ConversationDetailsContent
          conversationId={conversationId}
          currentUserId={currentUserId}
          onClose={onClose}
          onLeft={onLeft}
          className="h-full"
        />
      </SheetContent>
    </Sheet>
  );
}
