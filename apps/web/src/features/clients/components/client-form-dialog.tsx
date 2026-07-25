"use client";

import type { Client, CreateClientInput } from "@enterprise/shared";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiClientError } from "@/services/api/api-error";

import { useCreateClient, useUpdateClient } from "../hooks/use-client-mutations";
import { ClientForm } from "./client-form";

interface ClientFormDialogProps {
  open: boolean;
  mode: "create" | "edit";
  client?: Client | null;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (client: Client) => void;
}

export function ClientFormDialog({
  open,
  mode,
  client,
  onOpenChange,
  onSuccess,
}: ClientFormDialogProps) {
  const createMutation = useCreateClient();
  const updateMutation = useUpdateClient();
  const isSubmitting =
    createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async (values: CreateClientInput) => {
    try {
      if (mode === "create") {
        const created = await createMutation.mutateAsync(values);
        onSuccess?.(created);
        onOpenChange(false);
        return;
      }

      if (!client) {
        return;
      }

      const updated = await updateMutation.mutateAsync({
        id: client.id,
        input: values,
      });
      onSuccess?.(updated);
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ApiClientError && error.errors?.length) {
        // Field errors are shown via toast-less alert below through mutation error
        return;
      }
      throw error;
    }
  };

  const mutationError =
    (createMutation.error instanceof ApiClientError
      ? createMutation.error
      : null) ||
    (updateMutation.error instanceof ApiClientError
      ? updateMutation.error
      : null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create client" : "Edit client"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Add a new company to your client directory."
              : "Update company and contact details."}
          </DialogDescription>
        </DialogHeader>

        {mutationError ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
            {mutationError.message}
          </p>
        ) : null}

        <ClientForm
          mode={mode}
          initialValues={mode === "edit" ? client : null}
          isSubmitting={isSubmitting}
          onCancel={() => onOpenChange(false)}
          onSubmit={handleSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}
