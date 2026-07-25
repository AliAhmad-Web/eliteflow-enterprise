import {
  COMMUNICATION_API_PREFIX,
  type ActivityListResponse,
  type AddConversationMembersInput,
  type Comment,
  type CommentListResponse,
  type CommunicationSearchQueryInput,
  type CommunicationSearchResponse,
  type Conversation,
  type ConversationListResponse,
  type CreateCommentInput,
  type CreateConversationInput,
  type CreateMessageInput,
  type ForwardMessageInput,
  type ListActivitiesQueryInput,
  type ListCommentsQueryInput,
  type ListConversationsQueryInput,
  type ListMessagesQueryInput,
  type MarkMessagesReadInput,
  type Message,
  type MessageListResponse,
  type ReactToMessageInput,
  type TypingInput,
  type UpdateCommentInput,
  type UpdateConversationInput,
  type UpdateMessageInput,
  type UserPresence,
} from "@enterprise/shared";

import { apiRequest } from "@/services/api/api-client";

import { communicationHubService } from "./communication-hub.service";

const BASE = COMMUNICATION_API_PREFIX;

function qs(
  params: Record<string, string | number | boolean | undefined | null>,
): string {
  const p = new URLSearchParams();
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null && val !== "") {
      p.set(key, String(val));
    }
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

export const communicationService = {
  listConversations(query: ListConversationsQueryInput) {
    return apiRequest<ConversationListResponse>(
      `${BASE}/conversations${qs({
        page: query.page,
        pageSize: query.pageSize,
        search: query.search,
        type: query.type,
      })}`,
      { auth: true },
    );
  },

  getConversation(id: string) {
    return apiRequest<Conversation>(`${BASE}/conversations/${id}`, {
      auth: true,
    });
  },

  createConversation(input: CreateConversationInput) {
    return apiRequest<Conversation>(`${BASE}/conversations`, {
      method: "POST",
      body: input,
      auth: true,
    });
  },

  updateConversation(id: string, input: UpdateConversationInput) {
    return apiRequest<Conversation>(`${BASE}/conversations/${id}`, {
      method: "PATCH",
      body: input,
      auth: true,
    });
  },

  deleteConversation(id: string) {
    return apiRequest<{ id: string }>(`${BASE}/conversations/${id}`, {
      method: "DELETE",
      auth: true,
    });
  },

  addMembers(id: string, input: AddConversationMembersInput) {
    return apiRequest<Conversation>(`${BASE}/conversations/${id}/members`, {
      method: "POST",
      body: input,
      auth: true,
    });
  },

  removeMember(id: string, userId: string) {
    return apiRequest<Conversation>(
      `${BASE}/conversations/${id}/members/${userId}`,
      { method: "DELETE", auth: true },
    );
  },

  updateMemberRole(
    id: string,
    userId: string,
    input: { role: "OWNER" | "ADMIN" | "MEMBER" },
  ) {
    return apiRequest<Conversation>(
      `${BASE}/conversations/${id}/members/${userId}`,
      { method: "PATCH", body: input, auth: true },
    );
  },

  archiveConversation(id: string) {
    return apiRequest<Conversation>(`${BASE}/conversations/${id}/archive`, {
      method: "POST",
      auth: true,
    });
  },

  unarchiveConversation(id: string) {
    return apiRequest<Conversation>(`${BASE}/conversations/${id}/unarchive`, {
      method: "POST",
      auth: true,
    });
  },

  listMessages(conversationId: string, query: ListMessagesQueryInput) {
    return apiRequest<MessageListResponse>(
      `${BASE}/conversations/${conversationId}/messages${qs({
        page: query.page,
        pageSize: query.pageSize,
        cursor: query.cursor,
        before: query.before,
        search: query.search,
      })}`,
      { auth: true },
    );
  },

  sendMessage(conversationId: string, input: CreateMessageInput) {
    return apiRequest<Message>(
      `${BASE}/conversations/${conversationId}/messages`,
      { method: "POST", body: input, auth: true },
    );
  },

  updateMessage(messageId: string, input: UpdateMessageInput) {
    return apiRequest<Message>(`${BASE}/messages/${messageId}`, {
      method: "PATCH",
      body: input,
      auth: true,
    });
  },

  deleteMessage(messageId: string) {
    return apiRequest<{ id: string }>(`${BASE}/messages/${messageId}`, {
      method: "DELETE",
      auth: true,
    });
  },

  forwardMessage(messageId: string, input: ForwardMessageInput) {
    return apiRequest<Message>(`${BASE}/messages/${messageId}/forward`, {
      method: "POST",
      body: input,
      auth: true,
    });
  },

  pinMessage(messageId: string) {
    return apiRequest<Message>(`${BASE}/messages/${messageId}/pin`, {
      method: "POST",
      auth: true,
    });
  },

  unpinMessage(messageId: string) {
    return apiRequest<Message>(`${BASE}/messages/${messageId}/unpin`, {
      method: "POST",
      auth: true,
    });
  },

  react(messageId: string, input: ReactToMessageInput) {
    return apiRequest<{ id: string }>(`${BASE}/messages/${messageId}/react`, {
      method: "POST",
      body: input,
      auth: true,
    });
  },

  unreact(messageId: string, emoji: string) {
    return apiRequest<{ id: string }>(`${BASE}/messages/${messageId}/unreact`, {
      method: "POST",
      body: { emoji },
      auth: true,
    });
  },

  markRead(conversationId: string, input: MarkMessagesReadInput) {
    return apiRequest<{ count: number }>(
      `${BASE}/conversations/${conversationId}/read`,
      { method: "POST", body: input, auth: true },
    );
  },

  setTyping(conversationId: string, input: TypingInput) {
    return apiRequest<{ ok: boolean }>(
      `${BASE}/conversations/${conversationId}/typing`,
      { method: "POST", body: input, auth: true },
    );
  },

  heartbeat() {
    return apiRequest<{ ok: boolean }>(`${BASE}/presence/heartbeat`, {
      method: "POST",
      auth: true,
    });
  },

  setOffline() {
    return apiRequest<{ ok: boolean }>(`${BASE}/presence/offline`, {
      method: "POST",
      auth: true,
    });
  },

  getPresence(userIds: string[]) {
    return apiRequest<UserPresence[]>(
      `${BASE}/presence${qs({ userIds: userIds.join(",") })}`,
      { auth: true },
    );
  },

  listPinned(conversationId: string) {
    return apiRequest<Message[]>(
      `${BASE}/conversations/${conversationId}/pinned`,
      { auth: true },
    );
  },

  listComments(query: ListCommentsQueryInput) {
    return apiRequest<CommentListResponse>(
      `${BASE}/comments${qs({
        entityType: query.entityType,
        entityId: query.entityId,
        page: query.page,
        pageSize: query.pageSize,
      })}`,
      { auth: true },
    );
  },

  createComment(input: CreateCommentInput) {
    return apiRequest<Comment>(`${BASE}/comments`, {
      method: "POST",
      body: input,
      auth: true,
    });
  },

  updateComment(id: string, input: UpdateCommentInput) {
    return apiRequest<Comment>(`${BASE}/comments/${id}`, {
      method: "PATCH",
      body: input,
      auth: true,
    });
  },

  deleteComment(id: string) {
    return apiRequest<{ id: string }>(`${BASE}/comments/${id}`, {
      method: "DELETE",
      auth: true,
    });
  },

  listActivities(query: ListActivitiesQueryInput) {
    return apiRequest<ActivityListResponse>(
      `${BASE}/activities${qs({
        page: query.page,
        pageSize: query.pageSize,
        search: query.search,
        entityType: query.entityType,
        entityId: query.entityId,
        action: query.action,
      })}`,
      { auth: true },
    );
  },

  syncActivities() {
    return apiRequest<{ created: number }>(`${BASE}/activities/sync`, {
      method: "POST",
      auth: true,
    });
  },

  search(query: CommunicationSearchQueryInput) {
    return apiRequest<CommunicationSearchResponse>(
      `${BASE}/search${qs({
        q: query.q,
        scope: query.scope,
        page: query.page,
        pageSize: query.pageSize,
        userId: query.userId,
        fromDate: query.fromDate,
        toDate: query.toDate,
        hasAttachment:
          query.hasAttachment === undefined
            ? undefined
            : String(query.hasAttachment),
        hasMention:
          query.hasMention === undefined
            ? undefined
            : String(query.hasMention),
        isPinned:
          query.isPinned === undefined ? undefined : String(query.isPinned),
      })}`,
      { auth: true },
    );
  },

  // Phase 20 — Communication Hub
  listAnnouncements: communicationHubService.listAnnouncements,
  getAnnouncement: communicationHubService.getAnnouncement,
  createAnnouncement: communicationHubService.createAnnouncement,
  updateAnnouncement: communicationHubService.updateAnnouncement,
  deleteAnnouncement: communicationHubService.deleteAnnouncement,
  markAnnouncementRead: communicationHubService.markAnnouncementRead,
  listThreads: communicationHubService.listThreads,
  getThread: communicationHubService.getThread,
  createThread: communicationHubService.createThread,
  updateThread: communicationHubService.updateThread,
  deleteThread: communicationHubService.deleteThread,
  resolveThread: communicationHubService.resolveThread,
  createReply: communicationHubService.createReply,
  listMeetings: communicationHubService.listMeetings,
  getMeeting: communicationHubService.getMeeting,
  createMeeting: communicationHubService.createMeeting,
  updateMeeting: communicationHubService.updateMeeting,
  deleteMeeting: communicationHubService.deleteMeeting,
  updateMeetingParticipant: communicationHubService.updateMeetingParticipant,
  addMeetingRecording: communicationHubService.addMeetingRecording,
  addMeetingScreenShare: communicationHubService.addMeetingScreenShare,
  runAi: communicationHubService.runAi,
  listChannels: communicationHubService.listChannels,
};

export { communicationHubService };
