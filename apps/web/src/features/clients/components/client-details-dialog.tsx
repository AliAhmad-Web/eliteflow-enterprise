"use client";

import type { Client } from "@enterprise/shared";
import { PERMISSIONS } from "@enterprise/shared";
import { ExternalLink, Mail, MapPin, Phone } from "lucide-react";

import { ErrorState } from "@/components/common/feedback/error-state";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PermissionGuard } from "@/features/rbac/components/permission-guards";

import { useClient } from "../hooks/use-clients";
import { ClientStatusBadge } from "./client-status-badge";

interface ClientDetailsDialogProps {
  open: boolean;
  clientId: string | null;
  onOpenChange: (open: boolean) => void;
  onEdit?: (client: Client) => void;
  onDelete?: (client: Client) => void;
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="grid gap-1 sm:grid-cols-[140px_1fr] sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{value || "—"}</dd>
    </div>
  );
}

export function ClientDetailsDialog({
  open,
  clientId,
  onOpenChange,
  onEdit,
  onDelete,
}: ClientDetailsDialogProps) {
  const { data: client, isLoading, isError, error, refetch } = useClient(
    open ? clientId : null,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Client details</DialogTitle>
          <DialogDescription>
            Company profile and contact information.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <LoadingState
            label="Loading client"
            className="min-h-[200px] border-0 bg-transparent"
          />
        ) : null}

        {isError ? (
          <ErrorState
            title="Could not load client"
            description={
              error instanceof Error ? error.message : "Please try again."
            }
            onRetry={() => void refetch()}
            className="min-h-[200px]"
          />
        ) : null}

        {client ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-foreground">
                  {client.companyName}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {client.contactName}
                </p>
              </div>
              <ClientStatusBadge status={client.status} />
            </div>

            <dl className="space-y-3 rounded-xl border border-border/50 bg-muted/20 p-4">
              <DetailRow
                label="Email"
                value={
                  <a
                    href={`mailto:${client.email}`}
                    className="inline-flex items-center gap-1.5 text-primary hover:underline"
                  >
                    <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                    {client.email}
                  </a>
                }
              />
              <DetailRow
                label="Phone"
                value={
                  client.phone ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                      {client.phone}
                    </span>
                  ) : null
                }
              />
              <DetailRow
                label="Website"
                value={
                  client.website ? (
                    <a
                      href={client.website}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-primary hover:underline"
                    >
                      {client.website.replace(/^https?:\/\//, "")}
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  ) : null
                }
              />
              <DetailRow
                label="Location"
                value={
                  client.city || client.country || client.addressLine1 ? (
                    <span className="inline-flex items-start gap-1.5">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span>
                        {[client.addressLine1, client.city, client.country]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </span>
                  ) : null
                }
              />
              <DetailRow label="Notes" value={client.notes} />
              <DetailRow
                label="Created"
                value={new Date(client.createdAt).toLocaleString()}
              />
              <DetailRow
                label="Updated"
                value={new Date(client.updatedAt).toLocaleString()}
              />
            </dl>

            <DialogFooter className="gap-2 sm:justify-between">
              <Button
                type="button"
                variant="secondary"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
              <div className="flex flex-wrap gap-2">
                <PermissionGuard permission={PERMISSIONS.CLIENTS_WRITE}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onEdit?.(client)}
                  >
                    Edit
                  </Button>
                </PermissionGuard>
                <PermissionGuard permission={PERMISSIONS.CLIENTS_DELETE}>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => onDelete?.(client)}
                  >
                    Delete
                  </Button>
                </PermissionGuard>
              </div>
            </DialogFooter>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
