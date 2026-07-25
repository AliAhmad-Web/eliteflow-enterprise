"use client";

import { useQuery } from "@tanstack/react-query";
import type {
  ListFilesQueryInput,
  ListFoldersQueryInput,
} from "@enterprise/shared";

import { filesService } from "../services/files.service";
import { FILES_QUERY_KEYS } from "../types/files.types";

export function useFolders(query: ListFoldersQueryInput) {
  return useQuery({
    queryKey: FILES_QUERY_KEYS.folders(String(query.parentId ?? "root")),
    queryFn: () => filesService.listFolders(query),
  });
}

export function useFiles(query: ListFilesQueryInput) {
  return useQuery({
    queryKey: FILES_QUERY_KEYS.list(query),
    queryFn: () => filesService.listFiles(query),
  });
}

export function useFileDetail(id: string | null) {
  return useQuery({
    queryKey: FILES_QUERY_KEYS.detail(id ?? "none"),
    queryFn: () => filesService.getFile(id!),
    enabled: Boolean(id),
  });
}

export function useFileVersions(id: string | null) {
  return useQuery({
    queryKey: FILES_QUERY_KEYS.versions(id ?? "none"),
    queryFn: () => filesService.listVersions(id!),
    enabled: Boolean(id),
  });
}

export function useFileActivities(id: string | null) {
  return useQuery({
    queryKey: FILES_QUERY_KEYS.activity(id ?? "none"),
    queryFn: () => filesService.listActivities(id!),
    enabled: Boolean(id),
  });
}
