"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CommunicationAiRequestInput,
  CreateAnnouncementInput,
  CreateDiscussionReplyInput,
  CreateDiscussionThreadInput,
  CreateMeetingRecordingInput,
  CreateMeetingRoomInput,
  CreateMeetingScreenShareInput,
  ListAnnouncementsQueryInput,
  ListConversationsQueryInput,
  ListDiscussionThreadsQueryInput,
  ListMeetingsQueryInput,
  UpdateAnnouncementInput,
  UpdateDiscussionThreadInput,
  UpdateMeetingParticipantInput,
  UpdateMeetingRoomInput,
} from "@enterprise/shared";

import { communicationQueryDefaults } from "../lib/communication-query-defaults";
import { communicationService } from "../services/communication.service";
import { COMMUNICATION_QUERY_KEYS } from "../types/communication.types";

function useQC() {
  return useQueryClient();
}

function invalidateAnnouncements(qc: ReturnType<typeof useQC>) {
  void qc.invalidateQueries({
    queryKey: COMMUNICATION_QUERY_KEYS.announcements(),
  });
}

function invalidateThreads(qc: ReturnType<typeof useQC>) {
  void qc.invalidateQueries({ queryKey: COMMUNICATION_QUERY_KEYS.threads() });
}

function invalidateMeetings(qc: ReturnType<typeof useQC>) {
  void qc.invalidateQueries({ queryKey: COMMUNICATION_QUERY_KEYS.meetings() });
}

function invalidateChannels(qc: ReturnType<typeof useQC>) {
  void qc.invalidateQueries({ queryKey: COMMUNICATION_QUERY_KEYS.channels() });
}

// ---------------------------------------------------------------------------
// Channels
// ---------------------------------------------------------------------------
export function useChannels(
  query: ListConversationsQueryInput,
  enabled = true,
) {
  return useQuery({
    queryKey: COMMUNICATION_QUERY_KEYS.channelsList(query),
    queryFn: () => communicationService.listChannels(query),
    enabled,
    ...communicationQueryDefaults,
  });
}

// ---------------------------------------------------------------------------
// Announcements
// ---------------------------------------------------------------------------
export function useAnnouncements(
  query: ListAnnouncementsQueryInput,
  enabled = true,
) {
  return useQuery({
    queryKey: COMMUNICATION_QUERY_KEYS.announcementsList(query),
    queryFn: () => communicationService.listAnnouncements(query),
    enabled,
    ...communicationQueryDefaults,
  });
}

export function useAnnouncement(id: string | null, enabled = true) {
  return useQuery({
    queryKey: COMMUNICATION_QUERY_KEYS.announcementDetail(id ?? "none"),
    queryFn: () => communicationService.getAnnouncement(id!),
    enabled: Boolean(id) && enabled,
    ...communicationQueryDefaults,
  });
}

export function useCreateAnnouncement() {
  const qc = useQC();
  return useMutation({
    mutationFn: (input: CreateAnnouncementInput) =>
      communicationService.createAnnouncement(input),
    onSuccess: () => invalidateAnnouncements(qc),
  });
}

export function useUpdateAnnouncement(id: string) {
  const qc = useQC();
  return useMutation({
    mutationFn: (input: UpdateAnnouncementInput) =>
      communicationService.updateAnnouncement(id, input),
    onSuccess: () => {
      invalidateAnnouncements(qc);
      void qc.invalidateQueries({
        queryKey: COMMUNICATION_QUERY_KEYS.announcementDetail(id),
      });
    },
  });
}

export function useDeleteAnnouncement() {
  const qc = useQC();
  return useMutation({
    mutationFn: (id: string) => communicationService.deleteAnnouncement(id),
    onSuccess: () => invalidateAnnouncements(qc),
  });
}

export function useMarkAnnouncementRead() {
  const qc = useQC();
  return useMutation({
    mutationFn: (id: string) => communicationService.markAnnouncementRead(id),
    onMutate: async (id) => {
      await qc.cancelQueries({
        queryKey: COMMUNICATION_QUERY_KEYS.announcements(),
      });
      const previous = qc.getQueriesData({
        queryKey: COMMUNICATION_QUERY_KEYS.announcements(),
      });
      qc.setQueriesData(
        { queryKey: COMMUNICATION_QUERY_KEYS.announcements() },
        (old: unknown) => {
          if (!old || typeof old !== "object" || !("items" in old)) {
            return old;
          }
          const list = old as {
            items: Array<{ id: string; isRead?: boolean }>;
          };
          return {
            ...list,
            items: list.items.map((item) =>
              item.id === id ? { ...item, isRead: true } : item,
            ),
          };
        },
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      for (const [key, data] of context?.previous ?? []) {
        qc.setQueryData(key, data);
      }
    },
    onSettled: (_data, _err, id) => {
      invalidateAnnouncements(qc);
      void qc.invalidateQueries({
        queryKey: COMMUNICATION_QUERY_KEYS.announcementDetail(id),
      });
    },
  });
}

// ---------------------------------------------------------------------------
// Threads
// ---------------------------------------------------------------------------
export function useThreads(
  query: ListDiscussionThreadsQueryInput,
  enabled = true,
) {
  return useQuery({
    queryKey: COMMUNICATION_QUERY_KEYS.threadsList(query),
    queryFn: () => communicationService.listThreads(query),
    enabled,
    ...communicationQueryDefaults,
  });
}

export function useThread(id: string | null, enabled = true) {
  return useQuery({
    queryKey: COMMUNICATION_QUERY_KEYS.threadDetail(id ?? "none"),
    queryFn: () => communicationService.getThread(id!),
    enabled: Boolean(id) && enabled,
    ...communicationQueryDefaults,
  });
}

export function useCreateThread() {
  const qc = useQC();
  return useMutation({
    mutationFn: (input: CreateDiscussionThreadInput) =>
      communicationService.createThread(input),
    onSuccess: () => invalidateThreads(qc),
  });
}

export function useUpdateThread(id: string) {
  const qc = useQC();
  return useMutation({
    mutationFn: (input: UpdateDiscussionThreadInput) =>
      communicationService.updateThread(id, input),
    onSuccess: () => {
      invalidateThreads(qc);
      void qc.invalidateQueries({
        queryKey: COMMUNICATION_QUERY_KEYS.threadDetail(id),
      });
    },
  });
}

export function useDeleteThread() {
  const qc = useQC();
  return useMutation({
    mutationFn: (id: string) => communicationService.deleteThread(id),
    onSuccess: () => invalidateThreads(qc),
  });
}

export function useResolveThread() {
  const qc = useQC();
  return useMutation({
    mutationFn: (id: string) => communicationService.resolveThread(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: COMMUNICATION_QUERY_KEYS.threads() });
      const previous = qc.getQueriesData({
        queryKey: COMMUNICATION_QUERY_KEYS.threads(),
      });
      qc.setQueriesData(
        { queryKey: COMMUNICATION_QUERY_KEYS.threads() },
        (old: unknown) => {
          if (!old || typeof old !== "object" || !("items" in old)) {
            return old;
          }
          const list = old as {
            items: Array<{ id: string; status?: string }>;
          };
          return {
            ...list,
            items: list.items.map((item) =>
              item.id === id ? { ...item, status: "RESOLVED" } : item,
            ),
          };
        },
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      for (const [key, data] of context?.previous ?? []) {
        qc.setQueryData(key, data);
      }
    },
    onSettled: (_data, _err, id) => {
      invalidateThreads(qc);
      void qc.invalidateQueries({
        queryKey: COMMUNICATION_QUERY_KEYS.threadDetail(id),
      });
    },
  });
}

export function useCreateThreadReply(threadId: string) {
  const qc = useQC();
  return useMutation({
    mutationFn: (input: CreateDiscussionReplyInput) =>
      communicationService.createReply(threadId, input),
    onSuccess: () => {
      invalidateThreads(qc);
      void qc.invalidateQueries({
        queryKey: COMMUNICATION_QUERY_KEYS.threadDetail(threadId),
      });
    },
  });
}

// ---------------------------------------------------------------------------
// Meetings
// ---------------------------------------------------------------------------
export function useMeetings(query: ListMeetingsQueryInput, enabled = true) {
  return useQuery({
    queryKey: COMMUNICATION_QUERY_KEYS.meetingsList(query),
    queryFn: () => communicationService.listMeetings(query),
    enabled,
    ...communicationQueryDefaults,
  });
}

export function useMeeting(id: string | null, enabled = true) {
  return useQuery({
    queryKey: COMMUNICATION_QUERY_KEYS.meetingDetail(id ?? "none"),
    queryFn: () => communicationService.getMeeting(id!),
    enabled: Boolean(id) && enabled,
    ...communicationQueryDefaults,
  });
}

export function useCreateMeeting() {
  const qc = useQC();
  return useMutation({
    mutationFn: (input: CreateMeetingRoomInput) =>
      communicationService.createMeeting(input),
    onSuccess: () => invalidateMeetings(qc),
  });
}

export function useUpdateMeeting(id: string) {
  const qc = useQC();
  return useMutation({
    mutationFn: (input: UpdateMeetingRoomInput) =>
      communicationService.updateMeeting(id, input),
    onSuccess: () => {
      invalidateMeetings(qc);
      void qc.invalidateQueries({
        queryKey: COMMUNICATION_QUERY_KEYS.meetingDetail(id),
      });
    },
  });
}

export function useDeleteMeeting() {
  const qc = useQC();
  return useMutation({
    mutationFn: (id: string) => communicationService.deleteMeeting(id),
    onSuccess: () => invalidateMeetings(qc),
  });
}

export function useUpdateMeetingParticipant(meetingId: string) {
  const qc = useQC();
  return useMutation({
    mutationFn: ({
      userId,
      input,
    }: {
      userId: string;
      input: UpdateMeetingParticipantInput;
    }) =>
      communicationService.updateMeetingParticipant(meetingId, userId, input),
    onSuccess: () => {
      invalidateMeetings(qc);
      void qc.invalidateQueries({
        queryKey: COMMUNICATION_QUERY_KEYS.meetingDetail(meetingId),
      });
    },
  });
}

export function useAddMeetingRecording(meetingId: string) {
  const qc = useQC();
  return useMutation({
    mutationFn: (input: CreateMeetingRecordingInput) =>
      communicationService.addMeetingRecording(meetingId, input),
    onSuccess: () => {
      invalidateMeetings(qc);
      void qc.invalidateQueries({
        queryKey: COMMUNICATION_QUERY_KEYS.meetingDetail(meetingId),
      });
    },
  });
}

export function useAddMeetingScreenShare(meetingId: string) {
  const qc = useQC();
  return useMutation({
    mutationFn: (input: CreateMeetingScreenShareInput = {}) =>
      communicationService.addMeetingScreenShare(meetingId, input),
    onSuccess: () => {
      invalidateMeetings(qc);
      void qc.invalidateQueries({
        queryKey: COMMUNICATION_QUERY_KEYS.meetingDetail(meetingId),
      });
    },
  });
}

// ---------------------------------------------------------------------------
// Hub AI
// ---------------------------------------------------------------------------
export function useCommunicationHubAi() {
  const qc = useQC();
  return useMutation({
    mutationFn: (input: CommunicationAiRequestInput) =>
      communicationService.runAi(input),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: COMMUNICATION_QUERY_KEYS.hubAi(),
      });
    },
  });
}

export {
  invalidateAnnouncements,
  invalidateChannels,
  invalidateMeetings,
  invalidateThreads,
};
