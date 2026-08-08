"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateWhiteboardCommentInput,
  CreateWhiteboardInput,
  ListWhiteboardsQueryInput,
  UpdateWhiteboardInput,
  WhiteboardAiRequestInput,
} from "@enterprise/shared";

import { whiteboardsService } from "../services/whiteboards.service";

export const WHITEBOARDS_QUERY_KEYS = {
  all: ["whiteboards"] as const,
  list: (query: ListWhiteboardsQueryInput) =>
    [...WHITEBOARDS_QUERY_KEYS.all, "list", query] as const,
  detail: (id: string) => [...WHITEBOARDS_QUERY_KEYS.all, "detail", id] as const,
  versions: (id: string) =>
    [...WHITEBOARDS_QUERY_KEYS.all, "versions", id] as const,
  comments: (id: string) =>
    [...WHITEBOARDS_QUERY_KEYS.all, "comments", id] as const,
};

export function useWhiteboards(
  query: ListWhiteboardsQueryInput = {
    search: "",
    page: 1,
    limit: 50,
  },
) {
  return useQuery({
    queryKey: WHITEBOARDS_QUERY_KEYS.list(query),
    queryFn: () => whiteboardsService.list(query),
  });
}

export function useWhiteboard(id: string | null) {
  return useQuery({
    queryKey: WHITEBOARDS_QUERY_KEYS.detail(id ?? "none"),
    queryFn: () => whiteboardsService.getById(id!),
    enabled: Boolean(id),
  });
}

export function useWhiteboardComments(
  whiteboardId: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: WHITEBOARDS_QUERY_KEYS.comments(whiteboardId ?? "none"),
    queryFn: () => whiteboardsService.listComments(whiteboardId!),
    enabled: Boolean(whiteboardId) && enabled,
  });
}

export function useWhiteboardMutations() {
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: WHITEBOARDS_QUERY_KEYS.all });

  const create = useMutation({
    mutationFn: (input: CreateWhiteboardInput) =>
      whiteboardsService.create(input),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateWhiteboardInput }) =>
      whiteboardsService.update(id, input),
    onSuccess: invalidate,
  });

  const rename = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      whiteboardsService.rename(id, { title }),
    onSuccess: invalidate,
  });

  const duplicate = useMutation({
    mutationFn: (id: string) => whiteboardsService.duplicate(id),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => whiteboardsService.remove(id),
    onSuccess: invalidate,
  });

  const restoreVersion = useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) =>
      whiteboardsService.restoreVersion(id, version),
    onSuccess: invalidate,
  });

  const runAi = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: WhiteboardAiRequestInput;
    }) => whiteboardsService.runAi(id, input),
  });

  const addComment = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: CreateWhiteboardCommentInput;
    }) => whiteboardsService.addComment(id, input),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: WHITEBOARDS_QUERY_KEYS.comments(variables.id),
      });
    },
  });

  return {
    create,
    update,
    rename,
    duplicate,
    remove,
    restoreVersion,
    runAi,
    addComment,
  };
}
