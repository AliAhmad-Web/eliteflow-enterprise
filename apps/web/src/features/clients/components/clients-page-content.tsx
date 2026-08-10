"use client";

import {
  CLIENT_PIPELINE_STAGES,
  CLIENT_STATUSES,
  PERMISSIONS,
  type Client,
  type ClientPipelineStageValue,
  type ClientStatusValue,
  type ListClientsQueryInput,
} from "@enterprise/shared";
import {
  Building2,
  LayoutGrid,
  List,
  Plus,
  Search,
  UserRound,
  Users,
} from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";

import { EmptyState } from "@/components/common/feedback/empty-state";
import { ErrorState } from "@/components/common/feedback/error-state";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { OpenedFromNotificationBanner } from "@/features/notifications/components/opened-from-notification-banner";
import { useEntityDeepLink } from "@/features/notifications/hooks/use-entity-deep-link";
import { useHasPermission } from "@/features/rbac/hooks/use-permissions";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { FORM_SELECT_CLASS } from "@/lib/form-styles";
import { cn } from "@/lib/utils";

import {
  useClientPipelineBoard,
  useClientStats,
  useClients,
} from "../hooks/use-clients";
import {
  CLIENT_PIPELINE_STAGE_LABELS,
  CLIENT_STATUS_LABELS,
} from "../types/clients.types";
import { ClientDetailsDialog } from "./client-details-dialog";
import { ClientFormDialog } from "./client-form-dialog";
import { ClientsPipelineBoard } from "./clients-pipeline-board";
import { ClientsTable } from "./clients-table";
import { DeleteClientDialog } from "./delete-client-dialog";

const selectClassName = FORM_SELECT_CLASS;

type ClientsViewMode = "list" | "pipeline";

export function ClientsPageContent() {
  const canWrite = useHasPermission(PERMISSIONS.CLIENTS_WRITE);
  const canDelete = useHasPermission(PERMISSIONS.CLIENTS_DELETE);

  const [viewMode, setViewMode] = useState<ClientsViewMode>("list");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const debouncedSearch = useDebouncedValue(deferredSearch, 300);
  const [status, setStatus] = useState<ClientStatusValue | "ALL">("ALL");
  const [pipelineStage, setPipelineStage] = useState<
    ClientPipelineStageValue | "ALL"
  >("ALL");
  const [sortBy, setSortBy] =
    useState<ListClientsQueryInput["sortBy"]>("createdAt");
  const [sortOrder, setSortOrder] =
    useState<ListClientsQueryInput["sortOrder"]>("desc");
  const [page, setPage] = useState(1);
  const limit = 10;

  const [createOpen, setCreateOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [viewClientId, setViewClientId] = useState<string | null>(null);
  const [deleteClient, setDeleteClient] = useState<Client | null>(null);
  const deepLink = useEntityDeepLink((openId) => setViewClientId(openId));

  const query = useMemo<ListClientsQueryInput>(
    () => ({
      search: debouncedSearch,
      status: status === "ALL" ? undefined : status,
      pipelineStage: pipelineStage === "ALL" ? undefined : pipelineStage,
      sortBy,
      sortOrder,
      page,
      limit,
    }),
    [debouncedSearch, status, pipelineStage, sortBy, sortOrder, page],
  );

  const { data, isLoading, isError, error, refetch, isFetching } =
    useClients(query);
  const statsQuery = useClientStats();
  const pipelineQuery = useClientPipelineBoard(viewMode === "pipeline");
  const showInitialLoading = isLoading && !data;

  const handleSort = (field: ListClientsQueryInput["sortBy"]) => {
    if (sortBy === field) {
      setSortOrder((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  const clients = data?.items ?? [];
  const pagination = data?.pagination;
  const totalPages = pagination?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <OpenedFromNotificationBanner
        visible={deepLink.bannerVisible}
        onDismiss={deepLink.dismissBanner}
      />
      <PageHeader
        title="Clients"
        description="Manage companies, CRM pipeline stages, contacts, and relationship activity."
        actionLabel={canWrite ? "Add client" : undefined}
        onAction={canWrite ? () => setCreateOpen(true) : undefined}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Total clients",
            value: statsQuery.data?.total ?? "—",
            icon: Users,
          },
          {
            label: "Active",
            value: statsQuery.data?.active ?? "—",
            icon: Building2,
          },
          {
            label: "Leads",
            value: statsQuery.data?.leads ?? "—",
            icon: UserRound,
          },
          {
            label: "Inactive",
            value: statsQuery.data?.inactive ?? "—",
            icon: Building2,
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border-border/50">
              <CardContent className="flex items-center justify-between gap-4 p-6">
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">
                    {stat.value}
                  </p>
                </div>
                <div className="icon-box icon-box-md rounded-lg bg-primary/10 text-primary">
                  <Icon strokeWidth={1.75} aria-hidden="true" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-border/50 shadow-(--shadow-sm)">
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="enterprise-toolbar static! border-0 bg-muted/25 p-3 shadow-none sm:p-3">
            <div className="relative w-full max-w-md">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search company, contact, email..."
                className="pl-9"
                aria-label="Search clients"
                disabled={viewMode === "pipeline"}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div
                className="inline-flex rounded-lg border border-border/60 bg-background p-0.5"
                role="group"
                aria-label="Clients view mode"
              >
                <Button
                  type="button"
                  size="sm"
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  className="h-8 gap-1.5"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-3.5 w-3.5" aria-hidden="true" />
                  List
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={viewMode === "pipeline" ? "secondary" : "ghost"}
                  className="h-8 gap-1.5"
                  onClick={() => setViewMode("pipeline")}
                >
                  <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
                  Pipeline
                </Button>
              </div>

              {viewMode === "list" ? (
                <>
                  <label htmlFor="client-status-filter" className="sr-only">
                    Filter by status
                  </label>
                  <select
                    id="client-status-filter"
                    className={cn(selectClassName, "min-w-35")}
                    value={status}
                    onChange={(event) => {
                      setStatus(
                        event.target.value as ClientStatusValue | "ALL",
                      );
                      setPage(1);
                    }}
                  >
                    <option value="ALL">All statuses</option>
                    {CLIENT_STATUSES.map((value) => (
                      <option key={value} value={value}>
                        {CLIENT_STATUS_LABELS[value]}
                      </option>
                    ))}
                  </select>

                  <label htmlFor="client-pipeline-filter" className="sr-only">
                    Filter by pipeline stage
                  </label>
                  <select
                    id="client-pipeline-filter"
                    className={cn(selectClassName, "min-w-35")}
                    value={pipelineStage}
                    onChange={(event) => {
                      setPipelineStage(
                        event.target.value as ClientPipelineStageValue | "ALL",
                      );
                      setPage(1);
                    }}
                  >
                    <option value="ALL">All stages</option>
                    {CLIENT_PIPELINE_STAGES.map((value) => (
                      <option key={value} value={value}>
                        {CLIENT_PIPELINE_STAGE_LABELS[value]}
                      </option>
                    ))}
                  </select>
                </>
              ) : null}

              {canWrite ? (
                <Button type="button" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Add client
                </Button>
              ) : null}
            </div>
          </div>

          {viewMode === "pipeline" ? (
            <ClientsPipelineBoard
              board={pipelineQuery.data}
              isLoading={pipelineQuery.isLoading}
              isError={pipelineQuery.isError}
              error={pipelineQuery.error}
              onRetry={() => void pipelineQuery.refetch()}
              onView={(client) => setViewClientId(client.id)}
              canWrite={canWrite}
            />
          ) : (
            <>
              {showInitialLoading ? (
                <LoadingState label="Loading clients" className="border-0" />
              ) : null}

              {isError ? (
                <ErrorState
                  title="Could not load clients"
                  description={
                    error instanceof Error
                      ? error.message
                      : "Please try again in a moment."
                  }
                  onRetry={() => void refetch()}
                />
              ) : null}

              {!showInitialLoading && !isError ? (
                <>
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <p>
                      {pagination
                        ? `${pagination.total} client${pagination.total === 1 ? "" : "s"}`
                        : null}
                      {isFetching ? " · Refreshing…" : null}
                    </p>
                  </div>

                  {clients.length === 0 &&
                  !deferredSearch &&
                  status === "ALL" &&
                  pipelineStage === "ALL" ? (
                    <EmptyState
                      title="No clients yet"
                      description="Create your first client to start tracking companies and contacts."
                      actionLabel={canWrite ? "Add client" : undefined}
                      onAction={
                        canWrite ? () => setCreateOpen(true) : undefined
                      }
                    />
                  ) : (
                    <ClientsTable
                      clients={clients}
                      sortBy={sortBy}
                      sortOrder={sortOrder}
                      onSort={handleSort}
                      onView={(client) => setViewClientId(client.id)}
                      onEdit={(client) => setEditClient(client)}
                      onDelete={(client) => setDeleteClient(client)}
                      canWrite={canWrite}
                      canDelete={canDelete}
                    />
                  )}

                  {totalPages > 1 ? (
                    <div className="flex items-center justify-between gap-3 pt-2">
                      <p className="text-xs text-muted-foreground">
                        Page {page} of {totalPages}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={page <= 1}
                          onClick={() =>
                            setPage((current) => Math.max(1, current - 1))
                          }
                        >
                          Previous
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={page >= totalPages}
                          onClick={() =>
                            setPage((current) =>
                              Math.min(totalPages, current + 1),
                            )
                          }
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <ClientFormDialog
        open={createOpen}
        mode="create"
        onOpenChange={setCreateOpen}
      />

      <ClientFormDialog
        open={Boolean(editClient)}
        mode="edit"
        client={editClient}
        onOpenChange={(open) => {
          if (!open) {
            setEditClient(null);
          }
        }}
      />

      <ClientDetailsDialog
        open={Boolean(viewClientId)}
        clientId={viewClientId}
        onOpenChange={(open) => {
          if (!open) {
            setViewClientId(null);
            deepLink.clearDeepLinkParams();
          }
        }}
        onEdit={(client) => {
          setViewClientId(null);
          deepLink.clearDeepLinkParams();
          window.setTimeout(() => setEditClient(client), 50);
        }}
        onDelete={(client) => {
          setViewClientId(null);
          deepLink.clearDeepLinkParams();
          window.setTimeout(() => setDeleteClient(client), 50);
        }}
      />

      <DeleteClientDialog
        open={Boolean(deleteClient)}
        client={deleteClient}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteClient(null);
          }
        }}
      />
    </div>
  );
}
