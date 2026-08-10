"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { Client, ClientPipelineStageValue, PortalUserDto } from "@enterprise/shared";
import { CLIENT_PIPELINE_STAGES, PERMISSIONS } from "@enterprise/shared";
import {
  ExternalLink,
  Link2,
  Mail,
  MapPin,
  Phone,
  Search,
  Unlink,
} from "lucide-react";

import { ErrorState } from "@/components/common/feedback/error-state";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PermissionGuard } from "@/features/rbac/components/permission-guards";
import { useHasPermission } from "@/features/rbac/hooks/use-permissions";
import { FORM_SELECT_CLASS } from "@/lib/form-styles";
import { cn } from "@/lib/utils";
import { ApiClientError } from "@/services/api/api-error";

import {
  useLinkPortalUser,
  useUnlinkPortalUser,
  useUpdateClientPipelineStage,
} from "../hooks/use-client-mutations";
import {
  useClient,
  useClientPortalUsers,
  useUnlinkedPortalUsers,
} from "../hooks/use-clients";
import { CLIENT_PIPELINE_STAGE_LABELS } from "../types/clients.types";
import { ClientActivitiesPanel } from "./client-activities-panel";
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

function portalUserLabel(user: PortalUserDto) {
  return `${user.firstName} ${user.lastName}`.trim() || user.email;
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
  const [portalSearch, setPortalSearch] = useState("");
  const deferredSearch = useDeferredValue(portalSearch.trim());
  const unlinkedQuery = useUnlinkedPortalUsers(
    { search: deferredSearch, page: 1, limit: 50 },
    open && Boolean(clientId),
  );
  const linkMutation = useLinkPortalUser(clientId);
  const unlinkMutation = useUnlinkPortalUser(clientId);
  const updatePipeline = useUpdateClientPipelineStage();
  const canWrite = useHasPermission(PERMISSIONS.CLIENTS_WRITE);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [unlinkTarget, setUnlinkTarget] = useState<PortalUserDto | null>(null);
  const [portalMessage, setPortalMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const [pipelineMessage, setPipelineMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!open) {
      setPortalSearch("");
      setSelectedUserId("");
      setUnlinkTarget(null);
      setPortalMessage(null);
      setPipelineMessage(null);
    }
  }, [open]);

  const linkedUsers = portalUsersQuery.data ?? [];
  const unlinkedOptions = useMemo(
    () => unlinkedQuery.data?.items ?? [],
    [unlinkedQuery.data?.items],
  );
  const selectedUnlinked = useMemo(
    () => unlinkedOptions.find((user) => user.id === selectedUserId) ?? null,
    [selectedUserId, unlinkedOptions],
  );

  const handleLink = async () => {
    if (!selectedUserId || !client) return;
    setPortalMessage(null);
    try {
      const linked = await linkMutation.mutateAsync(selectedUserId);
      setPortalMessage({
        tone: "success",
        text: `Linked ${linked.email} to ${client.companyName}.`,
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

  const handleConfirmUnlink = async () => {
    if (!unlinkTarget || !client) return;
    setPortalMessage(null);
    try {
      const unlinked = await unlinkMutation.mutateAsync(unlinkTarget.id);
      setPortalMessage({
        tone: "success",
        text: `Unlinked ${unlinked.email} from ${client.companyName}. They will no longer see this company's projects, invoices, or tasks.`,
      });
      setUnlinkTarget(null);
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

  const handlePipelineChange = async (pipelineStage: ClientPipelineStageValue) => {
    if (!client || client.pipelineStage === pipelineStage) return;
    setPipelineMessage(null);
    try {
      await updatePipeline.mutateAsync({ id: client.id, pipelineStage });
      setPipelineMessage({
        tone: "success",
        text: `Pipeline moved to ${CLIENT_PIPELINE_STAGE_LABELS[pipelineStage]}.`,
      });
      void refetch();
    } catch (err) {
      setPipelineMessage({
        tone: "error",
        text:
          err instanceof ApiClientError || err instanceof Error
            ? err.message
            : "Could not update pipeline stage.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Client details</DialogTitle>
          <DialogDescription>
            Company profile, CRM pipeline, activities, and portal user linking.
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
              <div className="flex flex-wrap items-center gap-2">
                <ClientStatusBadge status={client.status} />
                {client.pipelineStage ? (
                  <Badge variant="secondary">
                    {CLIENT_PIPELINE_STAGE_LABELS[client.pipelineStage]}
                  </Badge>
                ) : null}
              </div>
            </div>

            <div className="space-y-2 rounded-xl border border-border/50 bg-muted/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor="client-pipeline-stage">Pipeline stage</Label>
                {canWrite ? (
                  <select
                    id="client-pipeline-stage"
                    className={cn(FORM_SELECT_CLASS, "min-w-40")}
                    value={client.pipelineStage ?? "NEW"}
                    disabled={updatePipeline.isPending}
                    onChange={(event) => {
                      void handlePipelineChange(
                        event.target.value as ClientPipelineStageValue,
                      );
                    }}
                  >
                    {CLIENT_PIPELINE_STAGES.map((stage) => (
                      <option key={stage} value={stage}>
                        {CLIENT_PIPELINE_STAGE_LABELS[stage]}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-sm font-medium">
                    {client.pipelineStage
                      ? CLIENT_PIPELINE_STAGE_LABELS[client.pipelineStage]
                      : "—"}
                  </span>
                )}
              </div>
              {pipelineMessage ? (
                <p
                  className={
                    pipelineMessage.tone === "success"
                      ? "text-sm text-emerald-700 dark:text-emerald-400"
                      : "text-sm text-destructive"
                  }
                  role="status"
                >
                  {pipelineMessage.text}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Moving to Won/Lost also syncs Active/Inactive status.
                </p>
              )}
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

            <ClientActivitiesPanel clientId={client.id} canWrite={canWrite} />

            <section className="space-y-4 rounded-xl border border-border/50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">
                    Portal users
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Link existing CLIENT accounts to{" "}
                    <span className="font-medium text-foreground">
                      {client.companyName}
                    </span>{" "}
                    for scoped portal access. Only unlinked CLIENT users can be
                    linked — never invent CRM companies here.
                  </p>
                </div>
                <Badge variant="success">{linkedUsers.length} linked</Badge>
              </div>

              {portalMessage ? (
                <p
                  className={
                    portalMessage.tone === "success"
                      ? "rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400"
                      : "rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                  }
                  role="status"
                >
                  {portalMessage.text}
                </p>
              ) : null}

              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Linked to this company
                </p>
                {portalUsersQuery.isLoading ? (
                  <LoadingState
                    label="Loading portal users"
                    className="min-h-[80px] border-0 bg-transparent"
                  />
                ) : null}
                {linkedUsers.length === 0 && !portalUsersQuery.isLoading ? (
                  <p className="rounded-lg border border-dashed border-border/60 px-3 py-4 text-sm text-muted-foreground">
                    No portal users are linked to this company yet.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {linkedUsers.map((user) => (
                      <li
                        key={user.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/40 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium text-foreground">
                              {portalUserLabel(user)}
                            </p>
                            <Badge variant="success">Linked</Badge>
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {user.email}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Company: {user.companyName ?? client.companyName}
                          </p>
                        </div>
                        <PermissionGuard permission={PERMISSIONS.CLIENTS_WRITE}>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={
                              unlinkMutation.isPending || Boolean(unlinkTarget)
                            }
                            onClick={() => {
                              setPortalMessage(null);
                              setUnlinkTarget(user);
                            }}
                          >
                            <Unlink className="mr-1.5 h-3.5 w-3.5" />
                            Unlink
                          </Button>
                        </PermissionGuard>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {unlinkTarget ? (
                <div
                  className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3"
                  role="alertdialog"
                  aria-labelledby="unlink-portal-user-title"
                >
                  <div>
                    <p
                      id="unlink-portal-user-title"
                      className="text-sm font-semibold text-foreground"
                    >
                      Confirm unlink
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Remove{" "}
                      <span className="font-medium text-foreground">
                        {unlinkTarget.email}
                      </span>{" "}
                      from{" "}
                      <span className="font-medium text-foreground">
                        {client.companyName}
                      </span>
                      ? They will immediately lose access to this company&apos;s
                      projects, invoices, tasks, and files.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={unlinkMutation.isPending}
                      onClick={() => void handleConfirmUnlink()}
                    >
                      {unlinkMutation.isPending
                        ? "Unlinking…"
                        : "Confirm unlink"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={unlinkMutation.isPending}
                      onClick={() => setUnlinkTarget(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : null}

              <PermissionGuard permission={PERMISSIONS.CLIENTS_WRITE}>
                <div className="space-y-3 border-t border-border/40 pt-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Link portal user
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Search eligible unlinked CLIENT accounts by name or email,
                      then link them to this CRM company.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="portal-user-search">
                      Search unlinked CLIENT users
                    </Label>
                    <div className="relative">
                      <Search
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <Input
                        id="portal-user-search"
                        value={portalSearch}
                        onChange={(event) => {
                          setPortalSearch(event.target.value);
                          setSelectedUserId("");
                        }}
                        placeholder="Name or email…"
                        className="pl-9"
                        autoComplete="off"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="portal-user-select">Eligible users</Label>
                    <select
                      id="portal-user-select"
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={selectedUserId}
                      onChange={(event) =>
                        setSelectedUserId(event.target.value)
                      }
                      aria-label="Select unlinked CLIENT user"
                      disabled={unlinkedQuery.isLoading}
                    >
                      <option value="">
                        {unlinkedQuery.isLoading
                          ? "Loading eligible users…"
                          : unlinkedOptions.length === 0
                            ? deferredSearch
                              ? "No unlinked CLIENT users match this search"
                              : "No unlinked CLIENT users available"
                            : "Select an unlinked CLIENT user"}
                      </option>
                      {unlinkedOptions.map((user) => (
                        <option key={user.id} value={user.id}>
                          {portalUserLabel(user)} · {user.email} · Unlinked
                        </option>
                      ))}
                    </select>
                    {selectedUnlinked ? (
                      <p className="text-xs text-muted-foreground">
                        Will link{" "}
                        <span className="font-medium text-foreground">
                          {selectedUnlinked.email}
                        </span>{" "}
                        <Badge variant="warning" className="ml-1 align-middle">
                          Unlinked
                        </Badge>{" "}
                        →{" "}
                        <span className="font-medium text-foreground">
                          {client.companyName}
                        </span>
                      </p>
                    ) : null}
                  </div>

                  <Button
                    type="button"
                    disabled={!selectedUserId || linkMutation.isPending}
                    onClick={() => void handleLink()}
                  >
                    <Link2 className="mr-1.5 h-3.5 w-3.5" />
                    {linkMutation.isPending
                      ? "Linking…"
                      : "Link portal user"}
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
