"use client";

import type {
  CreateTaskInput,
  EmployeeUpdateTaskInput,
  Task,
} from "@enterprise/shared";

import { LoadingState } from "@/components/common/feedback/loading-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiClientError } from "@/services/api/api-error";

import {
  useCreateTask,
  useUpdateTask,
} from "../hooks/use-task-mutations";
import { useTaskAssignees, useTaskProjects } from "../hooks/use-tasks";
import { TaskForm } from "./task-form";

interface TaskFormDialogProps {
  open: boolean;
  mode: "create" | "edit";
  variant?: "full" | "employee";
  task?: Task | null;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (task: Task) => void;
}

export function TaskFormDialog({
  open,
  mode,
  variant = "full",
  task,
  onOpenChange,
  onSuccess,
}: TaskFormDialogProps) {
  const createMutation = useCreateTask();
  const updateMutation = useUpdateTask();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const loadOptions = open && variant === "full";
  const projectsQuery = useTaskProjects(loadOptions);
  const assigneesQuery = useTaskAssignees(loadOptions);

  const handleSubmit = async (
    values: CreateTaskInput | EmployeeUpdateTaskInput,
  ) => {
    try {
      if (mode === "create") {
        const created = await createMutation.mutateAsync(
          values as CreateTaskInput,
        );
        onSuccess?.(created);
        onOpenChange(false);
        return;
      }

      if (!task) {
        return;
      }

      const updated = await updateMutation.mutateAsync({
        id: task.id,
        input: values,
      });
      onSuccess?.(updated);
      onOpenChange(false);
    } catch {
      // surfaced via mutation error below
    }
  };

  const mutationError =
    (createMutation.error instanceof ApiClientError
      ? createMutation.error
      : null) ||
    (updateMutation.error instanceof ApiClientError
      ? updateMutation.error
      : null);

  const isLoadingOptions =
    variant === "full" &&
    (projectsQuery.isLoading || assigneesQuery.isLoading);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "create"
              ? "Create task"
              : variant === "employee"
                ? "Update task progress"
                : "Edit task"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Assign work to a project and team member with priority, dates, and labels."
              : variant === "employee"
                ? "Update status and progress for your assigned task."
                : "Update assignment, status, priority, progress, and attachments."}
          </DialogDescription>
        </DialogHeader>

        {mutationError ? (
          <p
            className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            {mutationError.message}
          </p>
        ) : null}

        {isLoadingOptions ? (
          <LoadingState
            label="Loading form options"
            className="min-h-[200px] border-0 bg-transparent"
          />
        ) : (
          <TaskForm
            mode={mode}
            variant={variant}
            initialValues={mode === "edit" ? task : null}
            projects={projectsQuery.data ?? []}
            assignees={assigneesQuery.data ?? []}
            isSubmitting={isSubmitting}
            onCancel={() => onOpenChange(false)}
            onSubmit={handleSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
