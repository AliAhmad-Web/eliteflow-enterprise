"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateClientInput, UpdateClientInput } from "@enterprise/shared";

import { clientsService } from "../services/clients.service";
import { CLIENTS_QUERY_KEYS } from "../types/clients.types";

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateClientInput) => clientsService.create(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CLIENTS_QUERY_KEYS.all });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateClientInput }) =>
      clientsService.update(id, input),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: CLIENTS_QUERY_KEYS.all });
      await queryClient.invalidateQueries({
        queryKey: CLIENTS_QUERY_KEYS.detail(variables.id),
      });
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => clientsService.remove(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CLIENTS_QUERY_KEYS.all });
    },
  });
}

export function useLinkPortalUser(clientId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) =>
      clientsService.linkPortalUser(clientId!, { userId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CLIENTS_QUERY_KEYS.all });
      if (clientId) {
        await queryClient.invalidateQueries({
          queryKey: CLIENTS_QUERY_KEYS.portalUsers(clientId),
        });
      }
    },
  });
}

export function useUnlinkPortalUser(clientId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) =>
      clientsService.unlinkPortalUser(clientId!, userId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CLIENTS_QUERY_KEYS.all });
      if (clientId) {
        await queryClient.invalidateQueries({
          queryKey: CLIENTS_QUERY_KEYS.portalUsers(clientId),
        });
      }
    },
  });
}
