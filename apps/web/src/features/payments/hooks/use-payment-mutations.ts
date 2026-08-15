"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  BankTransferSubmitInput,
  CreatePaymentRefundInput,
  DecidePaymentRefundInput,
  InitiateProviderPaymentInput,
  PakistanPaymentMethodValue,
  RejectPaymentInput,
  UpdatePaymentMethodConfigInput,
  VerifyPaymentInput,
  WalletPaymentNoticeInput,
} from "@enterprise/shared";

import { INVOICES_QUERY_KEYS } from "@/features/invoices/types/invoices.types";
import { PROJECTS_QUERY_KEYS } from "@/features/projects/types/projects.types";
import { QUOTES_QUERY_KEYS } from "@/features/quotes/types/quotes.types";

import { paymentsService } from "../services/payments.service";
import { PAYMENTS_QUERY_KEYS } from "../types/payments.types";

async function invalidatePayments(
  queryClient: ReturnType<typeof useQueryClient>,
  id?: string,
) {
  await queryClient.invalidateQueries({ queryKey: PAYMENTS_QUERY_KEYS.all });
  await queryClient.invalidateQueries({ queryKey: INVOICES_QUERY_KEYS.all });
  await queryClient.invalidateQueries({ queryKey: QUOTES_QUERY_KEYS.all });
  await queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEYS.all });
  if (id) {
    await queryClient.invalidateQueries({
      queryKey: PAYMENTS_QUERY_KEYS.detail(id),
    });
  }
}

export function useSubmitBankTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BankTransferSubmitInput) =>
      paymentsService.submitBankTransfer(input),
    onSuccess: async (payment) => {
      await invalidatePayments(queryClient, payment.id);
    },
  });
}

export function useSubmitWalletNotice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: WalletPaymentNoticeInput) =>
      paymentsService.submitWalletNotice(input),
    onSuccess: async (payment) => {
      await invalidatePayments(queryClient, payment.id);
    },
  });
}

export function useInitiateJazzCash() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: InitiateProviderPaymentInput) =>
      paymentsService.initiateJazzCash(input),
    onSuccess: async (result) => {
      await invalidatePayments(queryClient, result.payment.id);
    },
  });
}

export function useInitiateEasyPaisa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: InitiateProviderPaymentInput) =>
      paymentsService.initiateEasyPaisa(input),
    onSuccess: async (result) => {
      await invalidatePayments(queryClient, result.payment.id);
    },
  });
}

export function useVerifyPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input?: VerifyPaymentInput }) =>
      paymentsService.verify(id, input),
    onSuccess: async (payment) => {
      await invalidatePayments(queryClient, payment.id);
    },
  });
}

export function useRejectPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: RejectPaymentInput }) =>
      paymentsService.reject(id, input),
    onSuccess: async (payment) => {
      await invalidatePayments(queryClient, payment.id);
    },
  });
}

export function useUpdatePaymentMethod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      method,
      input,
    }: {
      method: PakistanPaymentMethodValue;
      input: UpdatePaymentMethodConfigInput;
    }) => paymentsService.updateMethod(method, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: PAYMENTS_QUERY_KEYS.methods(),
      });
    },
  });
}

export function useCreatePaymentRefund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: CreatePaymentRefundInput;
    }) => paymentsService.createRefund(id, input),
    onSuccess: async (_data, variables) => {
      await invalidatePayments(queryClient, variables.id);
    },
  });
}

export function useDecidePaymentRefund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      refundId,
      input,
    }: {
      id: string;
      refundId: string;
      input: DecidePaymentRefundInput;
    }) => paymentsService.decideRefund(id, refundId, input),
    onSuccess: async (_data, variables) => {
      await invalidatePayments(queryClient, variables.id);
    },
  });
}
