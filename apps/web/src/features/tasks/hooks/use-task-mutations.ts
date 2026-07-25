"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CreateTaskCommentInput,
  CreateTaskInput,
  UpdateTaskInput,
} from "@enterprise/shared";

import { tasksService } from "../services/tasks.service";
import { TASKS_QUERY_KEYS } from "../types/tasks.types";

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTaskInput) => tasksService.create(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEYS.all });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTaskInput }) =>
      tasksService.update(id, input),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEYS.all });
      await queryClient.invalidateQueries({
        queryKey: TASKS_QUERY_KEYS.detail(variables.id),
      });
      await queryClient.invalidateQueries({
        queryKey: TASKS_QUERY_KEYS.activity(variables.id),
      });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => tasksService.remove(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEYS.all });
    },
  });
}

export function useAddTaskComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: CreateTaskCommentInput;
    }) => tasksService.addComment(id, input),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: TASKS_QUERY_KEYS.detail(variables.id),
      });
      await queryClient.invalidateQueries({
        queryKey: TASKS_QUERY_KEYS.activity(variables.id),
      });
      await queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEYS.all });
    },
  });
}
