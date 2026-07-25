import {
  COMMUNICATION_API_PREFIX,
  type Announcement,
  type AnnouncementListResponse,
  type CommunicationAiRequestInput,
  type CommunicationAiResponse,
  type CommunicationPagination,
  type ConversationListResponse,
  type CreateAnnouncementInput,
  type CreateDiscussionReplyInput,
  type CreateDiscussionThreadInput,
  type CreateMeetingRecordingInput,
  type CreateMeetingRoomInput,
  type CreateMeetingScreenShareInput,
  type DiscussionReply,
  type DiscussionThread,
  type DiscussionThreadListResponse,
  type ListAnnouncementsQueryInput,
  type ListConversationsQueryInput,
  type ListDiscussionThreadsQueryInput,
  type ListMeetingsQueryInput,
  type MeetingParticipantDto,
  type MeetingRecordingDto,
  type MeetingRoom,
  type MeetingRoomListResponse,
  type MeetingScreenShareDto,
  type UpdateAnnouncementInput,
  type UpdateDiscussionThreadInput,
  type UpdateMeetingParticipantInput,
  type UpdateMeetingRoomInput,
} from "@enterprise/shared";

import { apiRequest } from "@/services/api/api-client";

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

type FlatListPayload<T> = {
  items: T[];
  total?: number;
  page?: number;
  pageSize?: number;
  pagination?: CommunicationPagination;
};

function normalizeList<T>(data: FlatListPayload<T>): {
  items: T[];
  pagination: CommunicationPagination;
} {
  if (data.pagination) {
    return { items: data.items, pagination: data.pagination };
  }
  const page = data.page ?? 1;
  const pageSize = data.pageSize ?? 30;
  const total = data.total ?? data.items.length;
  return {
    items: data.items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

export const communicationHubService = {
  // ---- Announcements --------------------------------------------------------

  async listAnnouncements(
    query: ListAnnouncementsQueryInput,
  ): Promise<AnnouncementListResponse> {
    const data = await apiRequest<FlatListPayload<Announcement>>(
      `${BASE}/announcements${qs({
        page: query.page,
        pageSize: query.pageSize,
        search: query.search,
        priority: query.priority,
        departmentId: query.departmentId,
        pinnedOnly:
          query.pinnedOnly === undefined ? undefined : String(query.pinnedOnly),
      })}`,
      { auth: true },
    );
    return normalizeList(data);
  },

  getAnnouncement(id: string) {
    return apiRequest<Announcement>(`${BASE}/announcements/${id}`, {
      auth: true,
    });
  },

  createAnnouncement(input: CreateAnnouncementInput) {
    return apiRequest<Announcement>(`${BASE}/announcements`, {
      method: "POST",
      body: input,
      auth: true,
    });
  },

  updateAnnouncement(id: string, input: UpdateAnnouncementInput) {
    return apiRequest<Announcement>(`${BASE}/announcements/${id}`, {
      method: "PATCH",
      body: input,
      auth: true,
    });
  },

  deleteAnnouncement(id: string) {
    return apiRequest<null>(`${BASE}/announcements/${id}`, {
      method: "DELETE",
      auth: true,
    });
  },

  markAnnouncementRead(id: string) {
    return apiRequest<{ id: string; readCount: number; isReadByMe: boolean }>(
      `${BASE}/announcements/${id}/read`,
      { method: "POST", auth: true },
    );
  },

  // ---- Threads --------------------------------------------------------------

  async listThreads(
    query: ListDiscussionThreadsQueryInput,
  ): Promise<DiscussionThreadListResponse> {
    const data = await apiRequest<FlatListPayload<DiscussionThread>>(
      `${BASE}/threads${qs({
        page: query.page,
        pageSize: query.pageSize,
        search: query.search,
        status: query.status,
        category: query.category,
        tag: query.tag,
        pinnedOnly:
          query.pinnedOnly === undefined ? undefined : String(query.pinnedOnly),
      })}`,
      { auth: true },
    );
    return normalizeList(data);
  },

  getThread(id: string) {
    return apiRequest<DiscussionThread>(`${BASE}/threads/${id}`, {
      auth: true,
    });
  },

  createThread(input: CreateDiscussionThreadInput) {
    return apiRequest<DiscussionThread>(`${BASE}/threads`, {
      method: "POST",
      body: input,
      auth: true,
    });
  },

  updateThread(id: string, input: UpdateDiscussionThreadInput) {
    return apiRequest<DiscussionThread>(`${BASE}/threads/${id}`, {
      method: "PATCH",
      body: input,
      auth: true,
    });
  },

  deleteThread(id: string) {
    return apiRequest<null>(`${BASE}/threads/${id}`, {
      method: "DELETE",
      auth: true,
    });
  },

  resolveThread(id: string) {
    return apiRequest<DiscussionThread>(`${BASE}/threads/${id}/resolve`, {
      method: "POST",
      auth: true,
    });
  },

  createReply(threadId: string, input: CreateDiscussionReplyInput) {
    return apiRequest<DiscussionReply>(`${BASE}/threads/${threadId}/replies`, {
      method: "POST",
      body: input,
      auth: true,
    });
  },

  // ---- Meetings -------------------------------------------------------------

  async listMeetings(
    query: ListMeetingsQueryInput,
  ): Promise<MeetingRoomListResponse> {
    const data = await apiRequest<FlatListPayload<MeetingRoom>>(
      `${BASE}/meetings${qs({
        page: query.page,
        pageSize: query.pageSize,
        search: query.search,
        status: query.status,
      })}`,
      { auth: true },
    );
    return normalizeList(data);
  },

  getMeeting(id: string) {
    return apiRequest<MeetingRoom>(`${BASE}/meetings/${id}`, { auth: true });
  },

  createMeeting(input: CreateMeetingRoomInput) {
    return apiRequest<MeetingRoom>(`${BASE}/meetings`, {
      method: "POST",
      body: input,
      auth: true,
    });
  },

  updateMeeting(id: string, input: UpdateMeetingRoomInput) {
    return apiRequest<MeetingRoom>(`${BASE}/meetings/${id}`, {
      method: "PATCH",
      body: input,
      auth: true,
    });
  },

  deleteMeeting(id: string) {
    return apiRequest<null>(`${BASE}/meetings/${id}`, {
      method: "DELETE",
      auth: true,
    });
  },

  updateMeetingParticipant(
    meetingId: string,
    userId: string,
    input: UpdateMeetingParticipantInput,
  ) {
    return apiRequest<MeetingParticipantDto>(
      `${BASE}/meetings/${meetingId}/participants/${userId}`,
      { method: "PATCH", body: input, auth: true },
    );
  },

  addMeetingRecording(meetingId: string, input: CreateMeetingRecordingInput) {
    return apiRequest<MeetingRecordingDto>(
      `${BASE}/meetings/${meetingId}/recordings`,
      { method: "POST", body: input, auth: true },
    );
  },

  addMeetingScreenShare(
    meetingId: string,
    input: CreateMeetingScreenShareInput = {},
  ) {
    return apiRequest<MeetingScreenShareDto>(
      `${BASE}/meetings/${meetingId}/screen-shares`,
      { method: "POST", body: input, auth: true },
    );
  },

  // ---- AI / Channels --------------------------------------------------------

  runAi(input: CommunicationAiRequestInput) {
    return apiRequest<CommunicationAiResponse>(`${BASE}/ai`, {
      method: "POST",
      body: input,
      auth: true,
    });
  },

  async listChannels(
    query: ListConversationsQueryInput,
  ): Promise<ConversationListResponse> {
    const data = await apiRequest<FlatListPayload<ConversationListResponse["items"][number]>>(
      `${BASE}/channels${qs({
        page: query.page,
        pageSize: query.pageSize,
        search: query.search,
        type: query.type,
        includeArchived: query.includeArchived,
        archivedOnly: query.archivedOnly,
      })}`,
      { auth: true },
    );
    return normalizeList(data);
  },
};
