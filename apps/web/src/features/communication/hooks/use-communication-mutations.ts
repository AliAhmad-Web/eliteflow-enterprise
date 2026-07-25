"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  AddConversationMembersInput,
  CreateCommentInput,
  CreateConversationInput,
  CreateMessageInput,
  ForwardMessageInput,
  ListCommentsQueryInput,
  MarkMessagesReadInput,
  ReactToMessageInput,
  UpdateCommentInput,
  UpdateConversationInput,
  UpdateMessageInput,
} from "@enterprise/shared";

import { communicationService } from "../services/communication.service";
import { COMMUNICATION_QUERY_KEYS } from "../types/communication.types";

function useQC() {
  return useQueryClient();
}

function invalidateConversations(qc: ReturnType<typeof useQC>) {
  void qc.invalidateQueries({ queryKey: COMMUNICATION_QUERY_KEYS.conversations() });
  void qc.invalidateQueries({ queryKey: COMMUNICATION_QUERY_KEYS.channels() });
}

function invalidateMessages(qc: ReturnType<typeof useQC>, conversationId: string) {
  void qc.invalidateQueries({
    queryKey: COMMUNICATION_QUERY_KEYS.messages(conversationId),
  });
  void qc.invalidateQueries({
    queryKey: COMMUNICATION_QUERY_KEYS.messagesInfinite(conversationId),
  });
}

function invalidatePinned(qc: ReturnType<typeof useQC>, conversationId: string) {
  void qc.invalidateQueries({
    queryKey: COMMUNICATION_QUERY_KEYS.pinned(conversationId),
  });
}

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------
export function useCreateConversation() {
  const qc = useQC();
  return useMutation({
    mutationFn: (input: CreateConversationInput) =>
      communicationService.createConversation(input),
    onSuccess: () => invalidateConversations(qc),
  });
}

export function useUpdateConversation(id: string) {
  const qc = useQC();
  return useMutation({
    mutationFn: (input: UpdateConversationInput) =>
      communicationService.updateConversation(id, input),
    onSuccess: () => {
      invalidateConversations(qc);
      void qc.invalidateQueries({
        queryKey: COMMUNICATION_QUERY_KEYS.conversationDetail(id),
      });
    },
  });
}

export function useDeleteConversation() {
  const qc = useQC();
  return useMutation({
    mutationFn: (id: string) => communicationService.deleteConversation(id),
    onSuccess: () => invalidateConversations(qc),
  });
}

export function useAddMembers(conversationId: string) {
  const qc = useQC();
  return useMutation({
    mutationFn: (input: AddConversationMembersInput) =>
      communicationService.addMembers(conversationId, input),
    onSuccess: () => {
      invalidateConversations(qc);
      void qc.invalidateQueries({
        queryKey: COMMUNICATION_QUERY_KEYS.conversationDetail(conversationId),
      });
    },
  });
}

export function useRemoveMember(conversationId: string) {
  const qc = useQC();
  return useMutation({
    mutationFn: (userId: string) =>
      communicationService.removeMember(conversationId, userId),
    onSuccess: () => {
      invalidateConversations(qc);
      void qc.invalidateQueries({
        queryKey: COMMUNICATION_QUERY_KEYS.conversationDetail(conversationId),
      });
    },
  });
}

export function useUpdateMemberRole(conversationId: string) {
  const qc = useQC();
  return useMutation({
    mutationFn: ({
      userId,
      role,
    }: {
      userId: string;
      role: "OWNER" | "ADMIN" | "MEMBER";
    }) => communicationService.updateMemberRole(conversationId, userId, { role }),
    onSuccess: () => {
      invalidateConversations(qc);
      void qc.invalidateQueries({
        queryKey: COMMUNICATION_QUERY_KEYS.conversationDetail(conversationId),
      });
    },
  });
}

export function useArchiveConversation() {
  const qc = useQC();
  return useMutation({
    mutationFn: (id: string) => communicationService.archiveConversation(id),
    onSuccess: (_data, id) => {
      invalidateConversations(qc);
      void qc.invalidateQueries({
        queryKey: COMMUNICATION_QUERY_KEYS.conversationDetail(id),
      });
    },
  });
}

export function useUnarchiveConversation() {
  const qc = useQC();
  return useMutation({
    mutationFn: (id: string) => communicationService.unarchiveConversation(id),
    onSuccess: (_data, id) => {
      invalidateConversations(qc);
      void qc.invalidateQueries({
        queryKey: COMMUNICATION_QUERY_KEYS.conversationDetail(id),
      });
    },
  });
}

// ---------------------------------------------------------------------------
// Messages (with optimistic send)
// ---------------------------------------------------------------------------
export function useSendMessage(conversationId: string) {
  const qc = useQC();
  return useMutation({
    mutationFn: (input: CreateMessageInput) =>
      communicationService.sendMessage(conversationId, input),
    onSuccess: () => invalidateMessages(qc, conversationId),
  });
}

export function useUpdateMessage(conversationId: string) {
  const qc = useQC();
  return useMutation({
    mutationFn: ({ messageId, input }: { messageId: string; input: UpdateMessageInput }) =>
      communicationService.updateMessage(messageId, input),
    onSuccess: () => invalidateMessages(qc, conversationId),
  });
}

export function useDeleteMessage(conversationId: string) {
  const qc = useQC();
  return useMutation({
    mutationFn: (messageId: string) =>
      communicationService.deleteMessage(messageId),
    onSuccess: () => invalidateMessages(qc, conversationId),
  });
}

export function useForwardMessage(conversationId: string) {
  const qc = useQC();
  return useMutation({
    mutationFn: ({ messageId, input }: { messageId: string; input: ForwardMessageInput }) =>
      communicationService.forwardMessage(messageId, input),
    onSuccess: () => invalidateConversations(qc),
  });
}

export function usePinMessage(conversationId: string) {
  const qc = useQC();
  return useMutation({
    mutationFn: (messageId: string) =>
      communicationService.pinMessage(messageId),
    onSuccess: () => {
      invalidateMessages(qc, conversationId);
      invalidatePinned(qc, conversationId);
    },
  });
}

export function useUnpinMessage(conversationId: string) {
  const qc = useQC();
  return useMutation({
    mutationFn: (messageId: string) =>
      communicationService.unpinMessage(messageId),
    onSuccess: () => {
      invalidateMessages(qc, conversationId);
      invalidatePinned(qc, conversationId);
    },
  });
}

export function useReactToMessage(conversationId: string) {
  const qc = useQC();
  return useMutation({
    mutationFn: ({ messageId, input }: { messageId: string; input: ReactToMessageInput }) =>
      communicationService.react(messageId, input),
    onSuccess: () => invalidateMessages(qc, conversationId),
  });
}

export function useUnreactToMessage(conversationId: string) {
  const qc = useQC();
  return useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      communicationService.unreact(messageId, emoji),
    onSuccess: () => invalidateMessages(qc, conversationId),
  });
}

export function useMarkRead(conversationId: string) {
  const qc = useQC();
  return useMutation({
    mutationFn: (input: MarkMessagesReadInput) =>
      communicationService.markRead(conversationId, input),
    onSuccess: () => {
      invalidateConversations(qc);
    },
  });
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------
export function useCreateComment(queryKey?: ListCommentsQueryInput) {
  const qc = useQC();
  return useMutation({
    mutationFn: (input: CreateCommentInput) =>
      communicationService.createComment(input),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({
        queryKey: COMMUNICATION_QUERY_KEYS.comments(
          queryKey ?? { entityType: vars.entityType, entityId: vars.entityId, page: 1, pageSize: 30 },
        ),
      });
    },
  });
}

export function useUpdateComment(_entityType: string, _entityId: string) {
  const qc = useQC();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCommentInput }) =>
      communicationService.updateComment(id, input),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: ["communication", "comments"],
      });
    },
  });
}

export function useDeleteComment(_entityType: string, _entityId: string) {
  const qc = useQC();
  return useMutation({
    mutationFn: (id: string) => communicationService.deleteComment(id),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: ["communication", "comments"],
      });
    },
  });
}

// ---------------------------------------------------------------------------
// Activities
// ---------------------------------------------------------------------------
export function useSyncActivities() {
  const qc = useQC();
  return useMutation({
    mutationFn: () => communicationService.syncActivities(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["communication", "activities"] });
    },
  });
}
