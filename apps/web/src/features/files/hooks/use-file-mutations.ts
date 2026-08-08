"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CreateFolderInput,
  MoveFileInput,
  ShareFileInput,
  UpdateFileInput,
  UpdateFolderInput,
} from "@enterprise/shared";

import { filesService } from "../services/files.service";
import { FILES_QUERY_KEYS } from "../types/files.types";

function invalidateFiles(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({ queryKey: FILES_QUERY_KEYS.all });
}

export function useCreateFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFolderInput) => filesService.createFolder(input),
    onSuccess: async () => {
      await invalidateFiles(queryClient);
    },
  });
}

export function useUpdateFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateFolderInput }) =>
      filesService.updateFolder(id, input),
    onSuccess: async () => {
      await invalidateFiles(queryClient);
    },
  });
}

export function useDeleteFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => filesService.deleteFolder(id),
    onSuccess: async () => {
      await invalidateFiles(queryClient);
    },
  });
}

export function useUploadFiles() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: filesService.uploadFiles,
    onSuccess: async () => {
      await invalidateFiles(queryClient);
    },
  });
}

export function useUpdateFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateFileInput }) =>
      filesService.updateFile(id, input),
    onSuccess: async () => {
      await invalidateFiles(queryClient);
    },
  });
}

export function useMoveFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: MoveFileInput }) =>
      filesService.moveFile(id, input),
    onSuccess: async () => {
      await invalidateFiles(queryClient);
    },
  });
}

export function useDeleteFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => filesService.deleteFile(id),
    onSuccess: async () => {
      await invalidateFiles(queryClient);
    },
  });
}

export function useRestoreFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => filesService.restoreFile(id),
    onSuccess: async () => {
      await invalidateFiles(queryClient);
    },
  });
}

export function usePermanentDeleteFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => filesService.permanentDelete(id),
    onSuccess: async () => {
      await invalidateFiles(queryClient);
    },
  });
}

export function useShareFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ShareFileInput }) =>
      filesService.shareFile(id, input),
    onSuccess: async () => {
      await invalidateFiles(queryClient);
    },
  });
}

export function useUnshareFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (shareId: string) => filesService.unshareFile(shareId),
    onSuccess: async () => {
      await invalidateFiles(queryClient);
    },
  });
}
