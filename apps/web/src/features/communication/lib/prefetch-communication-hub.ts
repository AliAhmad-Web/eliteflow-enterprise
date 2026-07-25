import { getQueryClient } from "@/services/api/query-client";

import { communicationService } from "../services/communication.service";
import { COMMUNICATION_QUERY_KEYS } from "../types/communication.types";
import {
  COMMUNICATION_GC_TIME_MS,
  COMMUNICATION_STALE_TIME_MS,
} from "./communication-query-defaults";

/** Must mirror default list query objects used by Communication page contents. */
const defaultChannelsQuery = {
  page: 1,
  pageSize: 30,
  search: undefined,
  type: undefined,
  includeArchived: undefined,
  archivedOnly: undefined,
};

const defaultThreadsQuery = {
  page: 1,
  pageSize: 30,
  search: undefined,
  status: undefined,
};

const defaultMeetingsQuery = {
  page: 1,
  pageSize: 30,
  search: undefined,
  status: undefined,
};

const defaultAnnouncementsQuery = {
  page: 1,
  pageSize: 30,
  search: undefined,
  priority: undefined,
};

const defaultActivitiesQuery = {
  page: 1,
  pageSize: 30,
  search: undefined,
  entityType: undefined,
};

/**
 * Warm Communication caches after login so Messages / Channels / Threads /
 * Meetings / Announcements / Activity open from memory.
 */
export async function prefetchCommunicationHub(): Promise<void> {
  const queryClient = getQueryClient();
  const opts = {
    staleTime: COMMUNICATION_STALE_TIME_MS,
    gcTime: COMMUNICATION_GC_TIME_MS,
  };

  await Promise.allSettled([
    queryClient.prefetchInfiniteQuery({
      queryKey: COMMUNICATION_QUERY_KEYS.conversationsInfinite(),
      queryFn: ({ pageParam }) =>
        communicationService.listConversations({
          page: typeof pageParam === "number" ? pageParam : 1,
          pageSize: 100,
        }),
      initialPageParam: 1 as number,
      ...opts,
    }),

    queryClient.prefetchQuery({
      queryKey: COMMUNICATION_QUERY_KEYS.channelsList(defaultChannelsQuery),
      queryFn: () => communicationService.listChannels(defaultChannelsQuery),
      ...opts,
    }),

    queryClient.prefetchQuery({
      queryKey: COMMUNICATION_QUERY_KEYS.threadsList(defaultThreadsQuery),
      queryFn: () => communicationService.listThreads(defaultThreadsQuery),
      ...opts,
    }),

    queryClient.prefetchQuery({
      queryKey: COMMUNICATION_QUERY_KEYS.meetingsList(defaultMeetingsQuery),
      queryFn: () => communicationService.listMeetings(defaultMeetingsQuery),
      ...opts,
    }),

    queryClient.prefetchQuery({
      queryKey: COMMUNICATION_QUERY_KEYS.announcementsList(
        defaultAnnouncementsQuery,
      ),
      queryFn: () =>
        communicationService.listAnnouncements(defaultAnnouncementsQuery),
      ...opts,
    }),

    queryClient.prefetchInfiniteQuery({
      queryKey: COMMUNICATION_QUERY_KEYS.activities(defaultActivitiesQuery),
      queryFn: ({ pageParam }) =>
        communicationService.listActivities({
          pageSize: 30,
          search: undefined,
          entityType: undefined,
          page: typeof pageParam === "number" ? pageParam : 1,
        }),
      initialPageParam: 1 as number,
      ...opts,
    }),
  ]);
}
