"use client";

import { PERMISSIONS } from "@enterprise/shared";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ErrorState } from "@/components/common/feedback/error-state";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { useAuthStore } from "@/features/auth/stores/auth.store";
import { useHasPermission } from "@/features/rbac/hooks/use-permissions";
import { cn } from "@/lib/utils";

import { useConversation } from "../hooks/use-communication";
import { useMarkRead } from "../hooks/use-communication-mutations";
import { ChatThread } from "./chat-thread";
import { ChatThreadSkeleton } from "./communication-skeletons";
import { ConversationDetailsPanel } from "./conversation-details-panel";

interface ChannelChatPageContentProps {
  channelId: string;
}

export function ChannelChatPageContent({
  channelId,
}: ChannelChatPageContentProps) {
  const canReadChat = useHasPermission(PERMISSIONS.CHAT_READ);
  const canReadComm = useHasPermission(PERMISSIONS.COMMUNICATION_READ);
  const canRead = canReadChat || canReadComm;
  const currentUserId = useAuthStore((s) => s.user?.id ?? "");
  const [showDetails, setShowDetails] = useState(false);
  const [focusMessageId, setFocusMessageId] = useState<string | null>(null);

  const {
    data: channel,
    isError,
    isLoading,
    refetch,
  } = useConversation(channelId, canRead);
  const markReadMut = useMarkRead(channelId);

  useEffect(() => {
    if (!channelId || !canRead) return;
    void markReadMut.mutate({});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mark once on open
  }, [channelId, canRead]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const messageId = params.get("m") || params.get("message");
    if (messageId) setFocusMessageId(messageId);
  }, [channelId]);

  const handleToggleDetails = useCallback(() => {
    setShowDetails((v) => !v);
  }, []);

  if (!canRead) {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState
          title="Access denied"
          description="You do not have permission to view this channel."
        />
      </div>
    );
  }

  if (isLoading && !channel) {
    return (
      <div
        className={cn(
          "overflow-hidden border border-border/50 bg-card shadow-sm",
          "-mx-3 -mb-2 -mt-4 h-[calc(100dvh-4.25rem)] rounded-none",
          "sm:-mx-4 sm:-mt-6 sm:h-[calc(100dvh-4.5rem)] sm:rounded-xl",
          "lg:-mx-8 lg:-mt-8 lg:h-[calc(100dvh-5rem)]",
        )}
      >
        <ChatThreadSkeleton />
      </div>
    );
  }

  if (isError || !channel) {
    return (
      <div className="space-y-4 p-4 sm:p-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={ROUTES.CHANNELS}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to channels
          </Link>
        </Button>
        <ErrorState
          title="Channel not found"
          description="This channel may have been deleted or you are not a member."
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex overflow-hidden border border-border/50 bg-card shadow-sm",
        "-mx-3 -mb-2 -mt-4 h-[calc(100dvh-4.25rem)] rounded-none",
        "sm:-mx-4 sm:-mt-6 sm:h-[calc(100dvh-4.5rem)] sm:rounded-xl",
        "lg:-mx-8 lg:-mt-8 lg:h-[calc(100dvh-5rem)]",
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2 sm:px-4">
          <Button variant="ghost" size="sm" className="h-8 px-2" asChild>
            <Link href={ROUTES.CHANNELS}>
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only sm:ml-1.5">Channels</span>
            </Link>
          </Button>
        </div>
        <div className="min-h-0 flex-1">
          <ChatThread
            conversation={channel}
            currentUserId={currentUserId}
            detailsOpen={showDetails}
            onToggleDetails={handleToggleDetails}
            focusMessageId={focusMessageId}
            onFocusMessageConsumed={() => setFocusMessageId(null)}
          />
        </div>
      </div>

      <ConversationDetailsPanel
        conversationId={channelId}
        currentUserId={currentUserId}
        open={showDetails}
        onClose={() => setShowDetails(false)}
        onLeft={() => {
          window.location.href = ROUTES.CHANNELS;
        }}
        variant="inline"
      />
    </div>
  );
}
