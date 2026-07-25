"use client";

import type { Client } from "@enterprise/shared";

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

import { useDeleteClient } from "../hooks/use-client-mutations";

interface DeleteClientDialogProps {
  open: boolean;
  client: Client | null;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

export function DeleteClientDialog({
  open,
  client,
  onOpenChange,
  onDeleted,
}: DeleteClientDialogProps) {
  const deleteMutation = useDeleteClient();

  const handleDelete = async () => {
    if (!client) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(client.id);
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
          <DialogTitle>Delete client</DialogTitle>
          <DialogDescription>
            {client
              ? `Delete “${client.companyName}”? This removes the client from the active directory. You can contact support if you need it restored.`
              : "Delete this client?"}
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
            Delete client
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
