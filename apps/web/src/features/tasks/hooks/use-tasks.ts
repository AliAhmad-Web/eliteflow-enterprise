"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { ListTasksQueryInput } from "@enterprise/shared";

import { tasksService } from "../services/tasks.service";
import { TASKS_QUERY_KEYS } from "../types/tasks.types";

export function useTasks(query: ListTasksQueryInput) {
  return useQuery({
    queryKey: TASKS_QUERY_KEYS.list(query),
    queryFn: () => tasksService.list(query),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useTaskStats() {
  return useQuery({
    queryKey: TASKS_QUERY_KEYS.stats(),
    queryFn: () => tasksService.getStats(),
    staleTime: 120_000,
  });
}

export function useTask(id: string | null) {
  return useQuery({
    queryKey: TASKS_QUERY_KEYS.detail(id ?? "none"),
    queryFn: () => tasksService.getById(id!),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export function useTaskAssignees(enabled: boolean) {
  return useQuery({
    queryKey: TASKS_QUERY_KEYS.assignees(),
    queryFn: () => tasksService.listAssignees(),
    enabled,
    staleTime: 120_000,
  });
}

export function useTaskProjects(enabled: boolean) {
  return useQuery({
    queryKey: TASKS_QUERY_KEYS.projects(),
    queryFn: () => tasksService.listProjects(),
    enabled,
    staleTime: 120_000,
  });
}

export function useTaskActivity(id: string | null) {
  return useQuery({
    queryKey: TASKS_QUERY_KEYS.activity(id ?? "none"),
    queryFn: () => tasksService.getActivity(id!),
    enabled: Boolean(id),
  });
}
