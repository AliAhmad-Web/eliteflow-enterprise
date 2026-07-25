"use client";



import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import type {

  CommunicationSearchQueryInput,

  ListActivitiesQueryInput,

  ListCommentsQueryInput,

  ListConversationsQueryInput,

} from "@enterprise/shared";



import { useIsKeepAlivePageActive } from "@/components/layout/keep-alive-page-active";



import {

  COMMUNICATION_LIST_POLL_MS,

  COMMUNICATION_MESSAGES_POLL_MS,

  COMMUNICATION_PRESENCE_POLL_MS,

  communicationQueryDefaults,

} from "../lib/communication-query-defaults";

import { communicationService } from "../services/communication.service";

import { COMMUNICATION_QUERY_KEYS } from "../types/communication.types";



// ---------------------------------------------------------------------------

// Conversations

// ---------------------------------------------------------------------------

export function useConversations(

  query: ListConversationsQueryInput,

  enabled = true,

) {

  return useQuery({

    queryKey: COMMUNICATION_QUERY_KEYS.conversationsList(query),

    queryFn: () => communicationService.listConversations(query),

    enabled,

    ...communicationQueryDefaults,

  });

}



/** Loads every conversation page so the sidebar can show the full workspace list. */

export function useConversationsInfinite(enabled = true) {

  // RC#5: pause soft poll when this keep-alive page is hidden.

  const pageActive = useIsKeepAlivePageActive();

  const poll = Boolean(enabled && pageActive);



  return useInfiniteQuery({

    queryKey: COMMUNICATION_QUERY_KEYS.conversationsInfinite(),

    queryFn: ({ pageParam }) =>

      communicationService.listConversations({

        page: typeof pageParam === "number" ? pageParam : 1,

        pageSize: 100,

      }),

    initialPageParam: 1 as number,

    getNextPageParam: (lastPage, _, lastPageParam) => {

      const { page, pageSize, total } = lastPage.pagination;

      const fetched = (page - 1) * pageSize + lastPage.items.length;

      return fetched < total ? (lastPageParam as number) + 1 : undefined;

    },

    enabled,

    ...communicationQueryDefaults,

    refetchInterval: poll ? COMMUNICATION_LIST_POLL_MS : false,

  });

}



export function useConversation(id: string | null, enabled = true) {

  return useQuery({

    queryKey: COMMUNICATION_QUERY_KEYS.conversationDetail(id ?? "none"),

    queryFn: () => communicationService.getConversation(id!),

    enabled: Boolean(id) && enabled,

    ...communicationQueryDefaults,

  });

}



// ---------------------------------------------------------------------------

// Messages — infinite scroll (load older pages going back)

// ---------------------------------------------------------------------------

export function useMessagesInfinite(

  conversationId: string | null,

  pageSize = 50,

  enabled = true,

) {

  const pageActive = useIsKeepAlivePageActive();

  const poll = Boolean(enabled && pageActive);



  return useInfiniteQuery({

    queryKey: COMMUNICATION_QUERY_KEYS.messagesInfinite(

      conversationId ?? "none",

      { pageSize },

    ),

    queryFn: ({ pageParam }) =>

      communicationService.listMessages(conversationId!, {

        page: 1,

        pageSize,

        cursor: typeof pageParam === "string" ? pageParam : undefined,

      }),

    initialPageParam: undefined as string | undefined,

    getNextPageParam: (lastPage) =>

      lastPage.hasMore && lastPage.nextCursor ? lastPage.nextCursor : undefined,

    enabled: Boolean(conversationId) && enabled,

    ...communicationQueryDefaults,

    // Soft poll for new messages only while the thread is open and visible.

    refetchInterval: poll ? COMMUNICATION_MESSAGES_POLL_MS : false,

  });

}



// ---------------------------------------------------------------------------

// Pinned messages

// ---------------------------------------------------------------------------

export function usePinnedMessages(

  conversationId: string | null,

  enabled = true,

) {

  return useQuery({

    queryKey: COMMUNICATION_QUERY_KEYS.pinned(conversationId ?? "none"),

    queryFn: () => communicationService.listPinned(conversationId!),

    enabled: Boolean(conversationId) && enabled,

    ...communicationQueryDefaults,

  });

}



// ---------------------------------------------------------------------------

// Comments

// ---------------------------------------------------------------------------

export function useComments(query: ListCommentsQueryInput, enabled = true) {

  return useQuery({

    queryKey: COMMUNICATION_QUERY_KEYS.comments(query),

    queryFn: () => communicationService.listComments(query),

    enabled,

    ...communicationQueryDefaults,

  });

}



// ---------------------------------------------------------------------------

// Activities (infinite pagination)

// ---------------------------------------------------------------------------

export function useActivitiesInfinite(

  query: Omit<ListActivitiesQueryInput, "page">,

  enabled = true,

) {

  return useInfiniteQuery({

    queryKey: COMMUNICATION_QUERY_KEYS.activities({ ...query, page: 1 }),

    queryFn: ({ pageParam }) =>

      communicationService.listActivities({

        ...query,

        page: typeof pageParam === "number" ? pageParam : 1,

      }),

    initialPageParam: 1 as number,

    getNextPageParam: (lastPage, _, lastPageParam) => {

      const { page, pageSize, total } = lastPage.pagination;

      const fetched = (page - 1) * pageSize + lastPage.items.length;

      return fetched < total ? (lastPageParam as number) + 1 : undefined;

    },

    enabled,

    ...communicationQueryDefaults,

  });

}



// ---------------------------------------------------------------------------

// Presence

// ---------------------------------------------------------------------------

export function usePresence(userIds: string[], enabled = true) {

  const pageActive = useIsKeepAlivePageActive();

  const poll = Boolean(enabled && pageActive);



  return useQuery({

    queryKey: COMMUNICATION_QUERY_KEYS.presence(userIds),

    queryFn: () => communicationService.getPresence(userIds),

    enabled: userIds.length > 0 && enabled,

    staleTime: COMMUNICATION_PRESENCE_POLL_MS,

    gcTime: communicationQueryDefaults.gcTime,

    structuralSharing: true,

    refetchOnWindowFocus: false,

    refetchInterval: poll ? COMMUNICATION_PRESENCE_POLL_MS : false,

  });

}



// ---------------------------------------------------------------------------

// Search

// ---------------------------------------------------------------------------

export function useCommunicationSearch(

  query: CommunicationSearchQueryInput,

  enabled = true,

) {

  const hasFilter =

    Boolean(query.userId) ||

    Boolean(query.fromDate) ||

    Boolean(query.toDate) ||

    query.hasAttachment === true ||

    query.hasMention === true ||

    query.isPinned === true;



  return useQuery({

    queryKey: COMMUNICATION_QUERY_KEYS.search(query),

    queryFn: () => communicationService.search(query),

    enabled: enabled && (Boolean(query.q?.trim()) || hasFilter),

    ...communicationQueryDefaults,

  });

}


