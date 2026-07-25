"use client";

import type { CreateInvoiceInput, Invoice } from "@enterprise/shared";

import { LoadingState } from "@/components/common/feedback/loading-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useClients } from "@/features/clients/hooks/use-clients";
import { useProjects } from "@/features/projects/hooks/use-projects";
import { ApiClientError } from "@/services/api/api-error";

import {
  useCreateInvoice,
  useUpdateInvoice,
} from "../hooks/use-invoice-mutations";
import { InvoiceForm } from "./invoice-form";

interface InvoiceFormDialogProps {
  open: boolean;
  mode: "create" | "edit";
  invoice?: Invoice | null;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (invoice: Invoice) => void;
}

export function InvoiceFormDialog({
  open,
  mode,
  invoice,
  onOpenChange,
  onSuccess,
}: InvoiceFormDialogProps) {
  const createMutation = useCreateInvoice();
  const updateMutation = useUpdateInvoice();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const clientsQuery = useClients({
    search: "",
    sortBy: "companyName",
    sortOrder: "asc",
    page: 1,
    limit: 100,
  });

  const projectsQuery = useProjects({
    search: "",
    sortBy: "name",
    sortOrder: "asc",
    page: 1,
    limit: 100,
  });

  const handleSubmit = async (values: CreateInvoiceInput) => {
    try {
      if (mode === "create") {
        const created = await createMutation.mutateAsync(values);
        onSuccess?.(created);
        onOpenChange(false);
        return;
      }

      if (!invoice) return;

      const updated = await updateMutation.mutateAsync({
        id: invoice.id,
        input: values,
      });
      onSuccess?.(updated);
      onOpenChange(false);
    } catch {
      // surfaced below
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
    clientsQuery.isLoading || projectsQuery.isLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create invoice" : "Edit invoice"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Select a client, add line items, and totals calculate automatically."
              : "Update invoice details, items, tax, discount, and payment status."}
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
          <InvoiceForm
            mode={mode}
            initialValues={mode === "edit" ? invoice : null}
            clients={clientsQuery.data?.items ?? []}
            projects={projectsQuery.data?.items ?? []}
            isSubmitting={isSubmitting}
            onCancel={() => onOpenChange(false)}
            onSubmit={handleSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
