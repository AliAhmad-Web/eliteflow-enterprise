"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateProjectInput, UpdateProjectInput } from "@enterprise/shared";

import { QUOTES_QUERY_KEYS } from "@/features/quotes/types/quotes.types";

import { projectsService } from "../services/projects.service";
import { PROJECTS_QUERY_KEYS } from "../types/projects.types";

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateProjectInput) => projectsService.create(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEYS.all });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateProjectInput }) =>
      projectsService.update(id, input),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEYS.all });
      await queryClient.invalidateQueries({
        queryKey: PROJECTS_QUERY_KEYS.detail(variables.id),
      });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => projectsService.remove(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEYS.all });
    },
  });
}

export function useCompleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => projectsService.complete(id),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEYS.all });
      await queryClient.invalidateQueries({
        queryKey: PROJECTS_QUERY_KEYS.detail(data.id),
      });
      await queryClient.invalidateQueries({ queryKey: QUOTES_QUERY_KEYS.all });
    },
  });
}
