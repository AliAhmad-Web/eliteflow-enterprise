"use client";

import type { CreateProjectInput, Project } from "@enterprise/shared";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { useClients } from "@/features/clients/hooks/use-clients";
import { ApiClientError } from "@/services/api/api-error";

import {
  useCreateProject,
  useUpdateProject,
} from "../hooks/use-project-mutations";
import { useProjectAssignees } from "../hooks/use-projects";
import { ProjectForm } from "./project-form";

interface ProjectFormDialogProps {
  open: boolean;
  mode: "create" | "edit";
  project?: Project | null;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (project: Project) => void;
}

export function ProjectFormDialog({
  open,
  mode,
  project,
  onOpenChange,
  onSuccess,
}: ProjectFormDialogProps) {
  const createMutation = useCreateProject();
  const updateMutation = useUpdateProject();
  const isSubmitting =
    createMutation.isPending || updateMutation.isPending;

  const clientsQuery = useClients({
    search: "",
    sortBy: "companyName",
    sortOrder: "asc",
    page: 1,
    limit: 100,
  });
  const assigneesQuery = useProjectAssignees(open);

  const handleSubmit = async (values: CreateProjectInput) => {
    const payload: CreateProjectInput = {
      ...values,
      milestones: values.milestones.map((milestone, index) => ({
        ...milestone,
        sortOrder: index,
      })),
    };

    try {
      if (mode === "create") {
        const created = await createMutation.mutateAsync(payload);
        onSuccess?.(created);
        onOpenChange(false);
        return;
      }

      if (!project) {
        return;
      }

      const updated = await updateMutation.mutateAsync({
        id: project.id,
        input: payload,
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
    clientsQuery.isLoading || assigneesQuery.isLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create project" : "Edit project"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Define delivery scope, client, team, timeline, and attachments."
              : "Update project details, assignments, milestones, and status."}
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
          <ProjectForm
            mode={mode}
            initialValues={mode === "edit" ? project : null}
            clients={clientsQuery.data?.items ?? []}
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
