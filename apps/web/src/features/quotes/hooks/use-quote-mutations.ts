"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CreateQuoteInput,
  GenerateQuoteInvoicesInput,
  RejectQuoteInput,
  UpdateQuoteInput,
} from "@enterprise/shared";

import { INVOICES_QUERY_KEYS } from "@/features/invoices/types/invoices.types";

import { quotesService } from "../services/quotes.service";
import { QUOTES_QUERY_KEYS } from "../types/quotes.types";

async function invalidateQuotes(
  queryClient: ReturnType<typeof useQueryClient>,
  id?: string,
) {
  await queryClient.invalidateQueries({ queryKey: QUOTES_QUERY_KEYS.all });
  await queryClient.invalidateQueries({ queryKey: INVOICES_QUERY_KEYS.all });
  if (id) {
    await queryClient.invalidateQueries({
      queryKey: QUOTES_QUERY_KEYS.detail(id),
    });
  }
}

export function useCreateQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateQuoteInput) => quotesService.create(input),
    onSuccess: async () => {
      await invalidateQuotes(queryClient);
    },
  });
}

export function useUpdateQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateQuoteInput }) =>
      quotesService.update(id, input),
    onSuccess: async (_data, variables) => {
      await invalidateQuotes(queryClient, variables.id);
    },
  });
}

export function useSendQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => quotesService.send(id),
    onSuccess: async (_data, id) => {
      await invalidateQuotes(queryClient, id);
    },
  });
}

export function useApproveQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => quotesService.approve(id),
    onSuccess: async (_data, id) => {
      await invalidateQuotes(queryClient, id);
    },
  });
}

export function useRejectQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: RejectQuoteInput }) =>
      quotesService.reject(id, input),
    onSuccess: async (_data, variables) => {
      await invalidateQuotes(queryClient, variables.id);
    },
  });
}

export function useCancelQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => quotesService.cancel(id),
    onSuccess: async (_data, id) => {
      await invalidateQuotes(queryClient, id);
    },
  });
}

export function useGenerateQuoteInvoices() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input?: GenerateQuoteInvoicesInput;
    }) => quotesService.generateInvoices(id, input),
    onSuccess: async (_data, variables) => {
      await invalidateQuotes(queryClient, variables.id);
    },
  });
}
