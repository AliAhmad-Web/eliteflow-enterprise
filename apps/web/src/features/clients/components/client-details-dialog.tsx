"use client";

import { useMemo, useState } from "react";
import type { Client } from "@enterprise/shared";
import { PERMISSIONS } from "@enterprise/shared";
import { ExternalLink, Link2, Mail, MapPin, Phone, Unlink } from "lucide-react";

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
import { ApiClientError } from "@/services/api/api-error";

import {
  useLinkPortalUser,
  useUnlinkPortalUser,
} from "../hooks/use-client-mutations";
import {
  useClient,
  useClientPortalUsers,
  useUnlinkedPortalUsers,
} from "../hooks/use-clients";
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
  const portalUsersQuery = useClientPortalUsers(open ? clientId : null);
  const unlinkedQuery = useUnlinkedPortalUsers(
    { search: "", page: 1, limit: 50 },
    open && Boolean(clientId),
  );
  const linkMutation = useLinkPortalUser(clientId);
  const unlinkMutation = useUnlinkPortalUser(clientId);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [portalMessage, setPortalMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  const unlinkedOptions = useMemo(
    () => unlinkedQuery.data?.items ?? [],
    [unlinkedQuery.data?.items],
  );

  const handleLink = async () => {
    if (!selectedUserId) return;
    setPortalMessage(null);
    try {
      await linkMutation.mutateAsync(selectedUserId);
      setPortalMessage({
        tone: "success",
        text: "Portal user linked to this company.",
      });
      setSelectedUserId("");
      void unlinkedQuery.refetch();
    } catch (err) {
      setPortalMessage({
        tone: "error",
        text:
          err instanceof ApiClientError || err instanceof Error
            ? err.message
            : "Could not link portal user.",
      });
    }
  };

  const handleUnlink = async (userId: string) => {
    setPortalMessage(null);
    try {
      await unlinkMutation.mutateAsync(userId);
      setPortalMessage({
        tone: "success",
        text: "Portal user unlinked.",
      });
      void unlinkedQuery.refetch();
    } catch (err) {
      setPortalMessage({
        tone: "error",
        text:
          err instanceof ApiClientError || err instanceof Error
            ? err.message
            : "Could not unlink portal user.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Client details</DialogTitle>
          <DialogDescription>
            Company profile, contact information, and portal user linking.
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
                      <MapPin
                        className="mt-0.5 h-3.5 w-3.5 shrink-0"
                        aria-hidden="true"
                      />
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

            <section className="space-y-3 rounded-xl border border-border/50 p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">
                    Portal users
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    CLIENT accounts linked to this company for portal access.
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {(portalUsersQuery.data ?? []).length} linked
                </span>
              </div>

              {portalMessage ? (
                <p
                  className={
                    portalMessage.tone === "success"
                      ? "text-sm text-emerald-700 dark:text-emerald-400"
                      : "text-sm text-destructive"
                  }
                  role="status"
                >
                  {portalMessage.text}
                </p>
              ) : null}

              {portalUsersQuery.isLoading ? (
                <LoadingState
                  label="Loading portal users"
                  className="min-h-[80px] border-0 bg-transparent"
                />
              ) : null}

              {(portalUsersQuery.data ?? []).length === 0 &&
              !portalUsersQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">
                  No portal users are linked yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {(portalUsersQuery.data ?? []).map((user) => (
                    <li
                      key={user.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/40 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                      <PermissionGuard permission={PERMISSIONS.CLIENTS_WRITE}>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={unlinkMutation.isPending}
                          onClick={() => void handleUnlink(user.id)}
                        >
                          <Unlink className="mr-1.5 h-3.5 w-3.5" />
                          Unlink
                        </Button>
                      </PermissionGuard>
                    </li>
                  ))}
                </ul>
              )}

              <PermissionGuard permission={PERMISSIONS.CLIENTS_WRITE}>
                <div className="flex flex-col gap-2 border-t border-border/40 pt-3 sm:flex-row sm:items-center">
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm sm:flex-1"
                    value={selectedUserId}
                    onChange={(event) => setSelectedUserId(event.target.value)}
                    aria-label="Select unlinked CLIENT user"
                  >
                    <option value="">Select unlinked CLIENT user</option>
                    {unlinkedOptions.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.firstName} {user.lastName} · {user.email}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    disabled={!selectedUserId || linkMutation.isPending}
                    onClick={() => void handleLink()}
                  >
                    <Link2 className="mr-1.5 h-3.5 w-3.5" />
                    Link user
                  </Button>
                </div>
              </PermissionGuard>
            </section>

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
