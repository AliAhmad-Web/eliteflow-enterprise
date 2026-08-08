"use client";

import type { AiConfirmationRequiredDto } from "@enterprise/shared";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiClientError, getApiErrorMessage } from "@/services/api/api-error";

import { aiService } from "../services/ai.service";

export interface AiConfirmationDialogProps {
  confirmation: AiConfirmationRequiredDto | null;
  onResolved: (status: "approved" | "rejected") => void;
  onDismiss: () => void;
}

function riskLabel(level: string): string {
  switch (level) {
    case "CRITICAL":
      return "Critical risk";
    case "HIGH":
      return "High risk";
    case "MEDIUM":
      return "Medium risk";
    case "LOW":
      return "Low risk";
    default:
      return level;
  }
}

export function AiConfirmationDialog({
  confirmation,
  onResolved,
  onDismiss,
}: AiConfirmationDialogProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!confirmation) return null;

  const open = true;

  async function handleApprove() {
    if (!confirmation) return;
    setBusy(true);
    setError(null);
    try {
      await aiService.approveToolConfirmation(confirmation.confirmationId);
      onResolved("approved");
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? getApiErrorMessage(err)
          : "Approval failed";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    if (!confirmation) return;
    setBusy(true);
    setError(null);
    try {
      await aiService.rejectToolConfirmation(confirmation.confirmationId);
      onResolved("rejected");
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? getApiErrorMessage(err)
          : "Rejection failed";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !busy) onDismiss();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm action</DialogTitle>
          <DialogDescription>
            This action requires your approval before the assistant can continue.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div>
            <p className="text-muted-foreground">Action</p>
            <p className="font-medium text-foreground">{confirmation.action}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Summary</p>
            <p className="text-foreground">{confirmation.summary}</p>
          </div>
          <div className="flex flex-wrap gap-4">
            <div>
              <p className="text-muted-foreground">Risk</p>
              <p className="font-medium text-foreground">
                {riskLabel(confirmation.riskLevel)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Expires</p>
              <p className="text-foreground">
                {new Date(confirmation.expiresAt).toLocaleString()}
              </p>
            </div>
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => void handleReject()}
          >
            Reject
          </Button>
          <Button
            type="button"
            disabled={busy}
            onClick={() => void handleApprove()}
          >
            {busy ? "Working…" : "Approve"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
