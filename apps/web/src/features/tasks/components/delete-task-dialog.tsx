"use client";

import type { Task } from "@enterprise/shared";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiClientError } from "@/services/api/api-error";

import { useDeleteTask } from "../hooks/use-task-mutations";

interface DeleteTaskDialogProps {
  open: boolean;
  task: Task | null;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

export function DeleteTaskDialog({
  open,
  task,
  onOpenChange,
  onDeleted,
}: DeleteTaskDialogProps) {
  const deleteMutation = useDeleteTask();

  const handleDelete = async () => {
    if (!task) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(task.id);
      onDeleted?.();
      onOpenChange(false);
    } catch {
      // surfaced via mutation error below
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete task</DialogTitle>
          <DialogDescription>
            {task
              ? `Delete “${task.title}”? This soft-deletes the task and hides it from active lists.`
              : "Delete this task?"}
          </DialogDescription>
        </DialogHeader>

        {deleteMutation.error instanceof ApiClientError ? (
          <p className="text-sm text-destructive" role="alert">
            {deleteMutation.error.message}
          </p>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={deleteMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            isLoading={deleteMutation.isPending}
            onClick={() => {
              void handleDelete();
            }}
          >
            Delete task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
