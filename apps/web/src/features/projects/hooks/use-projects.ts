"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { ListProjectsQueryInput } from "@enterprise/shared";

import { projectsService } from "../services/projects.service";
import { PROJECTS_QUERY_KEYS } from "../types/projects.types";

export function useProjects(query: ListProjectsQueryInput) {
  return useQuery({
    queryKey: PROJECTS_QUERY_KEYS.list(query),
    queryFn: () => projectsService.list(query),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useProjectStats() {
  return useQuery({
    queryKey: PROJECTS_QUERY_KEYS.stats(),
    queryFn: () => projectsService.getStats(),
    staleTime: 120_000,
  });
}

export function useProject(id: string | null) {
  return useQuery({
    queryKey: PROJECTS_QUERY_KEYS.detail(id ?? "none"),
    queryFn: () => projectsService.getById(id!),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export function useProjectAssignees(enabled: boolean) {
  return useQuery({
    queryKey: PROJECTS_QUERY_KEYS.assignees(),
    queryFn: () => projectsService.listAssignees(),
    enabled,
    staleTime: 120_000,
  });
}
