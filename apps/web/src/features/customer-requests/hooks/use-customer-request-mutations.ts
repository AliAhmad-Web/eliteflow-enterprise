"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  ApproveCustomerRequestInput,
  ClarifyCustomerRequestInput,
  ConvertCustomerRequestInput,
  CreateCustomerRequestInput,
  RejectCustomerRequestInput,
  StartCustomerRequestReviewInput,
  UpdateCustomerRequestInput,
} from "@enterprise/shared";

import { customerRequestsService } from "../services/customer-requests.service";
import { CUSTOMER_REQUESTS_QUERY_KEYS } from "../types/query-keys";

async function invalidateAll(queryClient: ReturnType<typeof useQueryClient>) {
  await queryClient.invalidateQueries({
    queryKey: CUSTOMER_REQUESTS_QUERY_KEYS.all,
  });
}

async function invalidateDetail(
  queryClient: ReturnType<typeof useQueryClient>,
  id: string,
) {
  await invalidateAll(queryClient);
  await queryClient.invalidateQueries({
    queryKey: CUSTOMER_REQUESTS_QUERY_KEYS.detail(id),
  });
}

export function useCreateCustomerRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCustomerRequestInput) =>
      customerRequestsService.create(input),
    onSuccess: async () => {
      await invalidateAll(queryClient);
    },
  });
}

export function useUpdateCustomerRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: UpdateCustomerRequestInput;
    }) => customerRequestsService.update(id, input),
    onSuccess: async (_data, variables) => {
      await invalidateDetail(queryClient, variables.id);
    },
  });
}

export function useSubmitCustomerRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => customerRequestsService.submit(id),
    onSuccess: async (_data, id) => {
      await invalidateDetail(queryClient, id);
    },
  });
}

export function useWithdrawCustomerRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => customerRequestsService.withdraw(id),
    onSuccess: async (_data, id) => {
      await invalidateDetail(queryClient, id);
    },
  });
}

export function useStartCustomerRequestReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input?: StartCustomerRequestReviewInput;
    }) => customerRequestsService.startReview(id, input),
    onSuccess: async (_data, variables) => {
      await invalidateDetail(queryClient, variables.id);
    },
  });
}

export function useClarifyCustomerRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: ClarifyCustomerRequestInput;
    }) => customerRequestsService.requestClarification(id, input),
    onSuccess: async (_data, variables) => {
      await invalidateDetail(queryClient, variables.id);
    },
  });
}

export function useApproveCustomerRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input?: ApproveCustomerRequestInput;
    }) => customerRequestsService.approve(id, input),
    onSuccess: async (_data, variables) => {
      await invalidateDetail(queryClient, variables.id);
    },
  });
}

export function useRejectCustomerRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: RejectCustomerRequestInput;
    }) => customerRequestsService.reject(id, input),
    onSuccess: async (_data, variables) => {
      await invalidateDetail(queryClient, variables.id);
    },
  });
}

export function useConvertCustomerRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: ConvertCustomerRequestInput;
    }) => customerRequestsService.convert(id, input),
    onSuccess: async (_data, variables) => {
      await invalidateDetail(queryClient, variables.id);
    },
  });
}
