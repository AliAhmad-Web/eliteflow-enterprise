"use client";

import type { MessageDto } from "@enterprise/shared";
import { useQueries } from "@tanstack/react-query";

import { communicationService } from "../services/communication.service";
import { COMMUNICATION_QUERY_KEYS } from "../types/communication.types";
import { stripLinkMarkers } from "../utils/message-linked-records";
import {
  extractUrls,
  isImageAttachment,
} from "../utils/message-content";

const MEDIA_PAGES = 5;
const PAGE_SIZE = 100;

export type SharedFileItem = {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  messageId: string;
  createdAt: string;
  senderName?: string;
};

export type SharedLinkItem = {
  url: string;
  messageId: string;
  createdAt: string;
  senderName?: string;
  preview: string;
};

export type ConversationMediaBundle = {
  messages: MessageDto[];
  images: SharedFileItem[];
  files: SharedFileItem[];
  links: SharedLinkItem[];
  stats: {
    messageCount: number;
    imageCount: number;
    fileCount: number;
    linkCount: number;
    reactionCount: number;
    pinnedCount: number;
    participantCount: number;
  };
  isLoading: boolean;
};

export function useConversationMedia(
  conversationId: string | null,
  enabled = true,
  participantCount = 0,
  pinnedCount = 0,
): ConversationMediaBundle {
  const pageIndexes = Array.from({ length: MEDIA_PAGES }, (_, i) => i + 1);

  const queries = useQueries({
    queries: pageIndexes.map((page) => ({
      queryKey: [
        ...COMMUNICATION_QUERY_KEYS.messages(conversationId ?? "none"),
        "media-scan",
        page,
      ],
      queryFn: () =>
        communicationService.listMessages(conversationId!, {
          page,
          pageSize: PAGE_SIZE,
        }),
      enabled: Boolean(conversationId) && enabled,
      staleTime: 30_000,
    })),
  });

  const isLoading = queries.some((q) => q.isLoading || q.isFetching);

  const messageMap = new Map<string, MessageDto>();
  for (const query of queries) {
    for (const item of query.data?.items ?? []) {
      messageMap.set(item.id, item);
    }
  }

  const messages = [...messageMap.values()].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const images: SharedFileItem[] = [];
  const files: SharedFileItem[] = [];
  const linkMap = new Map<string, SharedLinkItem>();
  let reactionCount = 0;

  for (const message of messages) {
    const senderName = message.sender
      ? `${message.sender.firstName} ${message.sender.lastName}`
      : undefined;
    reactionCount += message.reactions?.length ?? 0;

    for (const att of message.attachments ?? []) {
      const item: SharedFileItem = {
        id: att.id,
        fileName: att.fileName,
        fileUrl: att.fileUrl,
        mimeType: att.mimeType,
        sizeBytes: att.sizeBytes,
        messageId: message.id,
        createdAt: att.createdAt ?? message.createdAt,
        senderName,
      };
      if (isImageAttachment(att.mimeType, att.fileName)) {
        images.push(item);
      } else {
        files.push(item);
      }
    }

    for (const url of extractUrls(message.body)) {
      if (linkMap.has(url)) continue;
      linkMap.set(url, {
        url,
        messageId: message.id,
        createdAt: message.createdAt,
        senderName,
        preview: stripLinkMarkers(message.body).slice(0, 120),
      });
    }
  }

  return {
    messages,
    images,
    files,
    links: [...linkMap.values()],
    stats: {
      messageCount: messages.length,
      imageCount: images.length,
      fileCount: files.length,
      linkCount: linkMap.size,
      reactionCount,
      pinnedCount,
      participantCount,
    },
    isLoading,
  };
}
