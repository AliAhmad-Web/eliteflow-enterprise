"use client";

import type { ConversationDto } from "@enterprise/shared";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { useConversationsInfinite } from "../hooks/use-communication";
import { getConversationDisplayName } from "../utils/conversation-sidebar";

interface ForwardMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceConversationId: string;
  currentUserId?: string;
  isPending?: boolean;
  onForward: (targetConversationId: string) => void;
}

export function ForwardMessageDialog({
  open,
  onOpenChange,
  sourceConversationId,
  currentUserId,
  isPending,
  onForward,
}: ForwardMessageDialogProps) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data, isLoading } = useConversationsInfinite(open);

  const conversations = useMemo(() => {
    const map = new Map<string, ConversationDto>();
    for (const page of data?.pages ?? []) {
      for (const item of page.items) {
        if (item.id === sourceConversationId) continue;
        map.set(item.id, item);
      }
    }
    const q = search.trim().toLowerCase();
    return [...map.values()]
      .filter((conv) => {
        if (!q) return true;
        return getConversationDisplayName(conv, currentUserId)
          .toLowerCase()
          .includes(q);
      })
      .slice(0, 40);
  }, [data?.pages, sourceConversationId, search, currentUserId]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setSearch("");
          setSelectedId(null);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Forward message</DialogTitle>
          <DialogDescription>
            Choose a conversation to forward this message to.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search conversations…"
            className="h-9 pl-8"
          />
        </div>

        <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-border p-1">
          {isLoading ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              Loading…
            </p>
          ) : conversations.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              No conversations found.
            </p>
          ) : (
            conversations.map((conv) => {
              const selected = selectedId === conv.id;
              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => setSelectedId(conv.id)}
                  className={cn(
                    "flex w-full items-center rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                    selected
                      ? "bg-primary/10 text-foreground"
                      : "hover:bg-accent text-foreground",
                  )}
                >
                  <span className="truncate font-medium">
                    {getConversationDisplayName(conv, currentUserId)}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!selectedId || isPending}
            onClick={() => {
              if (!selectedId) return;
              onForward(selectedId);
            }}
          >
            {isPending ? "Forwarding…" : "Forward"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
