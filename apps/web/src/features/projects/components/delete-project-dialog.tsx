"use client";

import type { Project } from "@enterprise/shared";

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

import { useDeleteProject } from "../hooks/use-project-mutations";

interface DeleteProjectDialogProps {
  open: boolean;
  project: Project | null;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

export function DeleteProjectDialog({
  open,
  project,
  onOpenChange,
  onDeleted,
}: DeleteProjectDialogProps) {
  const deleteMutation = useDeleteProject();

  const handleDelete = async () => {
    if (!project) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(project.id);
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
          <DialogTitle>Delete project</DialogTitle>
          <DialogDescription>
            {project
              ? `Delete “${project.name}”? This soft-deletes the project and hides it from active lists.`
              : "Delete this project?"}
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
            Delete project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
