"use client";

import type { AiDocument } from "@enterprise/shared";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  maybeMemo,
  usePerformanceStableCallback,
} from "@/features/performance";

export interface AiDocumentDeleteDialogProps {
  document: AiDocument | null;
  errorMessage: string | null;
  isDeleting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

function AiDocumentDeleteDialogComponent({
  document,
  errorMessage,
  isDeleting,
  onOpenChange,
  onConfirm,
}: AiDocumentDeleteDialogProps) {
  const handleOpenChange = usePerformanceStableCallback((open: boolean) => {
    if (!open) onOpenChange(false);
  });
  const handleCancel = usePerformanceStableCallback(() => {
    onOpenChange(false);
  });

  return (
    <Dialog open={Boolean(document)} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete document</DialogTitle>
          <DialogDescription>
            {document
              ? `Delete “${document.title}”? This soft-deletes the document.`
              : "Delete this document?"}
          </DialogDescription>
        </DialogHeader>
        {errorMessage ? (
          <p className="text-sm text-destructive" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            isLoading={isDeleting}
            onClick={onConfirm}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const AiDocumentDeleteDialog = maybeMemo(
  AiDocumentDeleteDialogComponent,
);
