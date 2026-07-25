import {
  COMMUNICATION_API_PREFIX,
  type Conversation,
  type Message,
} from "@enterprise/shared";

import { apiRequest } from "@/api/api-client";
import { toQueryString } from "@/lib/utils";

export const communicationService = {
  listConversations(params: {
    page?: number;
    pageSize?: number;
    search?: string;
    type?: string;
  } = {}) {
    return apiRequest<{
      items: Conversation[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(
      `${COMMUNICATION_API_PREFIX}/conversations${toQueryString({
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 20,
        search: params.search,
        type: params.type,
      })}`,
      { auth: true },
    );
  },

  listChannels(params: { page?: number; pageSize?: number; search?: string } = {}) {
    return apiRequest<{
      items: Conversation[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(
      `${COMMUNICATION_API_PREFIX}/channels${toQueryString({
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 20,
        search: params.search,
      })}`,
      { auth: true },
    );
  },

  getConversation(id: string) {
    return apiRequest<Conversation>(
      `${COMMUNICATION_API_PREFIX}/conversations/${id}`,
      { auth: true },
    );
  },

  listMessages(
    conversationId: string,
    params: { page?: number; pageSize?: number; search?: string } = {},
  ) {
    return apiRequest<{
      items: Message[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
      hasMore?: boolean;
    }>(
      `${COMMUNICATION_API_PREFIX}/conversations/${conversationId}/messages${toQueryString(
        {
          page: params.page ?? 1,
          pageSize: params.pageSize ?? 30,
          search: params.search,
        },
      )}`,
      { auth: true },
    );
  },

  sendMessage(
    conversationId: string,
    body: {
      body: string;
      parentId?: string;
      mentionUserIds?: string[];
      kind?: "TEXT" | "SYSTEM" | "VOICE";
      attachments?: Array<{
        fileName: string;
        fileUrl: string;
        mimeType?: string | null;
        sizeBytes?: number | null;
        managedFileId?: string | null;
        durationSeconds?: number | null;
        waveformJson?: string | null;
      }>;
    },
  ) {
    return apiRequest<Message>(
      `${COMMUNICATION_API_PREFIX}/conversations/${conversationId}/messages`,
      { method: "POST", body, auth: true },
    );
  },

  markRead(conversationId: string, upToMessageId?: string) {
    return apiRequest<{ count: number }>(
      `${COMMUNICATION_API_PREFIX}/conversations/${conversationId}/read`,
      {
        method: "POST",
        body: upToMessageId ? { upToMessageId } : {},
        auth: true,
      },
    );
  },

  setTyping(conversationId: string, isTyping: boolean) {
    return apiRequest<{ ok: boolean }>(
      `${COMMUNICATION_API_PREFIX}/conversations/${conversationId}/typing`,
      { method: "POST", body: { isTyping }, auth: true },
    );
  },

  react(messageId: string, emoji: string) {
    return apiRequest(
      `${COMMUNICATION_API_PREFIX}/messages/${messageId}/react`,
      { method: "POST", body: { emoji }, auth: true },
    );
  },

  unreact(messageId: string, emoji: string) {
    return apiRequest(
      `${COMMUNICATION_API_PREFIX}/messages/${messageId}/unreact`,
      { method: "POST", body: { emoji }, auth: true },
    );
  },

  listAnnouncements(params: { page?: number; pageSize?: number } = {}) {
    return apiRequest<{
      items: Array<{
        id: string;
        title: string;
        body: string;
        priority?: string;
        isPinned?: boolean;
        createdAt: string;
      }>;
      pagination?: { page: number; total: number };
    }>(
      `${COMMUNICATION_API_PREFIX}/announcements${toQueryString({
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 20,
      })}`,
      { auth: true },
    );
  },

  listThreads(params: { page?: number; pageSize?: number } = {}) {
    return apiRequest<{
      items: Array<{
        id: string;
        title: string;
        body: string;
        status?: string;
        category?: string;
        createdAt: string;
      }>;
    }>(
      `${COMMUNICATION_API_PREFIX}/threads${toQueryString({
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 20,
      })}`,
      { auth: true },
    );
  },

  listMeetings(params: { page?: number; pageSize?: number } = {}) {
    return apiRequest<{
      items: Array<{
        id: string;
        title: string;
        description?: string | null;
        scheduledStart: string;
        status?: string;
      }>;
    }>(
      `${COMMUNICATION_API_PREFIX}/meetings${toQueryString({
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 20,
      })}`,
      { auth: true },
    );
  },

  listActivities(params: { page?: number; pageSize?: number; search?: string } = {}) {
    return apiRequest<{
      items: Array<{
        id: string;
        action: string;
        message?: string;
        createdAt: string;
        entityType?: string;
      }>;
    }>(
      `${COMMUNICATION_API_PREFIX}/activities${toQueryString({
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 30,
        search: params.search,
      })}`,
      { auth: true },
    );
  },
};
