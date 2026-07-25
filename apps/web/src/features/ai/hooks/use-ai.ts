"use client";

import { useQuery } from "@tanstack/react-query";
import type {
  ListAiConversationsQueryInput,
  ListAiDocumentsQueryInput,
} from "@enterprise/shared";

import { aiService } from "../services/ai.service";
import { AI_QUERY_KEYS } from "../types/ai.types";

export function useAiConversations(query: ListAiConversationsQueryInput) {
  return useQuery({
    queryKey: AI_QUERY_KEYS.conversationList(query),
    queryFn: () => aiService.listConversations(query),
  });
}

export function useAiConversation(id: string | null) {
  return useQuery({
    queryKey: AI_QUERY_KEYS.conversation(id ?? "none"),
    queryFn: () => aiService.getConversation(id!),
    enabled: Boolean(id),
  });
}

export function useAiDocuments(query: ListAiDocumentsQueryInput) {
  return useQuery({
    queryKey: AI_QUERY_KEYS.documentList(query),
    queryFn: () => aiService.listDocuments(query),
  });
}

export function useAiDocument(id: string | null) {
  return useQuery({
    queryKey: AI_QUERY_KEYS.document(id ?? "none"),
    queryFn: () => aiService.getDocument(id!),
    enabled: Boolean(id),
  });
}
