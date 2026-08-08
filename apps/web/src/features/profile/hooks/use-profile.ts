"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { AUTH_QUERY_KEYS } from "@/features/auth/types/auth.types";
import { syncAuthenticatedUserAvatar } from "@/features/auth/utils/sync-authenticated-user-avatar";
import { authService } from "@/features/auth/services/auth.service";
import { settingsKeys } from "@/features/settings/hooks/use-settings";
import { settingsService } from "@/features/settings/services/settings.service";

import type {
  CreateProfileDocumentMetaInput,
  UpdateSettingsProfileInput,
} from "@enterprise/shared";

export const profileKeys = {
  all: ["profile"] as const,
  overview: () => [...profileKeys.all, "overview"] as const,
  documents: () => [...profileKeys.all, "documents"] as const,
};

export function useProfileOverview() {
  return useQuery({
    queryKey: profileKeys.overview(),
    queryFn: () => settingsService.overview(),
    staleTime: 60_000,
    gcTime: 30 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useProfileDocuments() {
  return useQuery({
    queryKey: profileKeys.documents(),
    queryFn: async () => {
      const result = await settingsService.listProfileDocuments();
      return result.items;
    },
    staleTime: 60_000,
    gcTime: 30 * 60_000,
  });
}

async function invalidateProfile(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: profileKeys.all }),
    queryClient.invalidateQueries({ queryKey: settingsKeys.overview() }),
    queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEYS.me }),
    authService.getMe().catch(() => undefined),
  ]);
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateSettingsProfileInput) =>
      settingsService.updateProfile(input),
    onSuccess: async (result) => {
      syncAuthenticatedUserAvatar(queryClient, {
        avatarUrl: result.profile.avatarUrl,
        firstName: result.profile.firstName,
        lastName: result.profile.lastName,
      });
      await invalidateProfile(queryClient);
    },
  });
}

export function useUploadAvatarMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => settingsService.uploadAvatar(file),
    onSuccess: async (result) => {
      // Immediate Header sync from the same authenticated user record.
      syncAuthenticatedUserAvatar(queryClient, {
        avatarUrl: result.profile.avatarUrl,
        firstName: result.profile.firstName,
        lastName: result.profile.lastName,
      });
      await invalidateProfile(queryClient);
    },
  });
}

export function useRemoveAvatarMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => settingsService.removeAvatar(),
    onSuccess: async (result) => {
      syncAuthenticatedUserAvatar(queryClient, {
        avatarUrl: null,
        firstName: result.profile.firstName,
        lastName: result.profile.lastName,
      });
      await invalidateProfile(queryClient);
    },
  });
}

export function useUploadProfileDocumentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { file: File; meta?: CreateProfileDocumentMetaInput }) =>
      settingsService.uploadProfileDocument(input.file, input.meta),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: profileKeys.documents() });
    },
  });
}

export function useDeleteProfileDocumentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => settingsService.deleteProfileDocument(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: profileKeys.documents() });
    },
  });
}
