"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  AiChatRequestInput,
  CreateAiDocumentInput,
  UpdateAiDocumentInput,
} from "@enterprise/shared";

import {
  aiService,
  type AiChatStreamHandlers,
} from "../services/ai.service";
import { AI_QUERY_KEYS } from "../types/ai.types";

export function useAiChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      input,
      onMeta,
      onDelta,
    }: {
      input: AiChatRequestInput;
    } & AiChatStreamHandlers) =>
      aiService.chatStream(input, { onMeta, onDelta }),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({
        queryKey: AI_QUERY_KEYS.conversations(),
      });
      await queryClient.invalidateQueries({
        queryKey: AI_QUERY_KEYS.conversation(data.conversation.id),
      });
    },
  });
}

export function useDeleteAiConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => aiService.deleteConversation(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: AI_QUERY_KEYS.conversations(),
      });
    },
  });
}

export function useCreateAiDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateAiDocumentInput) =>
      aiService.createDocument(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: AI_QUERY_KEYS.documents(),
      });
    },
  });
}

export function useUpdateAiDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: UpdateAiDocumentInput;
    }) => aiService.updateDocument(id, input),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: AI_QUERY_KEYS.documents(),
      });
      await queryClient.invalidateQueries({
        queryKey: AI_QUERY_KEYS.document(variables.id),
      });
    },
  });
}

export function useDeleteAiDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => aiService.deleteDocument(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: AI_QUERY_KEYS.documents(),
      });
    },
  });
}
