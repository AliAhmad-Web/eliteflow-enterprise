"use client";

import type { Invoice } from "@enterprise/shared";

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

import { useDeleteInvoice } from "../hooks/use-invoice-mutations";

interface DeleteInvoiceDialogProps {
  open: boolean;
  invoice: Invoice | null;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

export function DeleteInvoiceDialog({
  open,
  invoice,
  onOpenChange,
  onDeleted,
}: DeleteInvoiceDialogProps) {
  const deleteMutation = useDeleteInvoice();

  const handleDelete = async () => {
    if (!invoice) return;
    try {
      await deleteMutation.mutateAsync(invoice.id);
      onDeleted?.();
      onOpenChange(false);
    } catch {
      // surfaced below
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete invoice</DialogTitle>
          <DialogDescription>
            {invoice
              ? `Delete “${invoice.invoiceNumber}”? This soft-deletes the invoice and hides it from active lists.`
              : "Delete this invoice?"}
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
            Delete invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
