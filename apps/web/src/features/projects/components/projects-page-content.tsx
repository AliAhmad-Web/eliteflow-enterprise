"use client";

import {
  PERMISSIONS,
  PROJECT_PRIORITIES,
  PROJECT_STATUSES,
  type ListProjectsQueryInput,
  type Project,
  type ProjectPriorityValue,
  type ProjectStatusValue,
} from "@enterprise/shared";
import {
  AlertTriangle,
  FolderKanban,
  PauseCircle,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

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
import { FORM_SELECT_CLASS } from "@/lib/form-styles";
import { cn } from "@/lib/utils";

import { useProjectStats, useProjects } from "../hooks/use-projects";
import {
  PROJECT_PRIORITY_LABELS,
  PROJECT_STATUS_LABELS,
} from "../types/projects.types";
import { DeleteProjectDialog } from "./delete-project-dialog";
import { ProjectDetailsDialog } from "./project-details-dialog";
import { ProjectFormDialog } from "./project-form-dialog";
import { ProjectsTable } from "./projects-table";

const selectClassName = FORM_SELECT_CLASS;

export function ProjectsPageContent() {
  const canWrite = useHasPermission(PERMISSIONS.PROJECTS_WRITE);
  const canDelete = useHasPermission(PERMISSIONS.PROJECTS_DELETE);

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const debouncedSearch = useDebouncedValue(deferredSearch, 300);
  const [status, setStatus] = useState<ProjectStatusValue | "ALL">("ALL");
  const [priority, setPriority] = useState<ProjectPriorityValue | "ALL">(
    "ALL",
  );
  const [sortBy, setSortBy] =
    useState<ListProjectsQueryInput["sortBy"]>("createdAt");
  const [sortOrder, setSortOrder] =
    useState<ListProjectsQueryInput["sortOrder"]>("desc");
  const [page, setPage] = useState(1);
  const limit = 10;

  const [createOpen, setCreateOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [viewProjectId, setViewProjectId] = useState<string | null>(null);
  const [deleteProject, setDeleteProject] = useState<Project | null>(null);
  const deepLink = useEntityDeepLink((openId) => setViewProjectId(openId));

  const query = useMemo<ListProjectsQueryInput>(
    () => ({
      search: debouncedSearch,
      status: status === "ALL" ? undefined : status,
      priority: priority === "ALL" ? undefined : priority,
      sortBy,
      sortOrder,
      page,
      limit,
    }),
    [debouncedSearch, status, priority, sortBy, sortOrder, page],
  );

  const { data, isLoading, isError, error, refetch, isFetching } =
    useProjects(query);
  const statsQuery = useProjectStats();
  const showInitialLoading = isLoading && !data;

  const handleSort = (field: ListProjectsQueryInput["sortBy"]) => {
    if (sortBy === field) {
      setSortOrder((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  const projects = data?.items ?? [];
  const pagination = data?.pagination;
  const totalPages = pagination?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <OpenedFromNotificationBanner
        visible={deepLink.bannerVisible}
        onDismiss={deepLink.dismissBanner}
      />
      <PageHeader
        title="Projects"
        description="Plan delivery, assign teams, track milestones, and monitor project health."
        actionLabel={canWrite ? "Add project" : undefined}
        onAction={canWrite ? () => setCreateOpen(true) : undefined}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Total projects",
            value: statsQuery.data?.total ?? "—",
            icon: FolderKanban,
          },
          {
            label: "In progress",
            value: statsQuery.data?.inProgress ?? "—",
            icon: Sparkles,
          },
          {
            label: "Overdue",
            value: statsQuery.data?.overdue ?? "—",
            icon: AlertTriangle,
          },
          {
            label: "On hold",
            value: statsQuery.data?.onHold ?? "—",
            icon: PauseCircle,
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

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Not started",
            value: statsQuery.data?.notStarted ?? "—",
          },
          {
            label: "Completed",
            value: statsQuery.data?.completed ?? "—",
          },
          {
            label: "Cancelled",
            value: statsQuery.data?.cancelled ?? "—",
          },
          {
            label: "High priority",
            value: statsQuery.data?.highPriority ?? "—",
          },
        ].map((stat) => (
          <Card key={stat.label} className="border-border/50">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="mt-1 text-xl font-semibold text-foreground">
                {stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/50 shadow-(--shadow-sm)">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
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
                placeholder="Search projects or clients..."
                className="pl-9"
                aria-label="Search projects"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="project-status-filter" className="sr-only">
                Filter by status
              </label>
              <select
                id="project-status-filter"
                className={cn(selectClassName, "min-w-37.5")}
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value as ProjectStatusValue | "ALL");
                  setPage(1);
                }}
              >
                <option value="ALL">All statuses</option>
                {PROJECT_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {PROJECT_STATUS_LABELS[value]}
                  </option>
                ))}
              </select>

              <label htmlFor="project-priority-filter" className="sr-only">
                Filter by priority
              </label>
              <select
                id="project-priority-filter"
                className={cn(selectClassName, "min-w-35")}
                value={priority}
                onChange={(event) => {
                  setPriority(
                    event.target.value as ProjectPriorityValue | "ALL",
                  );
                  setPage(1);
                }}
              >
                <option value="ALL">All priorities</option>
                {PROJECT_PRIORITIES.map((value) => (
                  <option key={value} value={value}>
                    {PROJECT_PRIORITY_LABELS[value]}
                  </option>
                ))}
              </select>

              {canWrite ? (
                <Button type="button" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Add project
                </Button>
              ) : null}
            </div>
          </div>

          {showInitialLoading ? (
            <LoadingState label="Loading projects" className="border-0" />
          ) : null}

          {isError ? (
            <ErrorState
              title="Could not load projects"
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
                    ? `${pagination.total} project${pagination.total === 1 ? "" : "s"}`
                    : null}
                  {isFetching ? " · Refreshing…" : null}
                </p>
              </div>

              {projects.length === 0 &&
              !deferredSearch &&
              status === "ALL" &&
              priority === "ALL" ? (
                <EmptyState
                  title="No projects yet"
                  description="Create your first project to track delivery, team, and milestones."
                  actionLabel={canWrite ? "Add project" : undefined}
                  onAction={canWrite ? () => setCreateOpen(true) : undefined}
                />
              ) : (
                <ProjectsTable
                  projects={projects}
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                  onView={(project) => setViewProjectId(project.id)}
                  onEdit={(project) => setEditProject(project)}
                  onDelete={(project) => setDeleteProject(project)}
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
                        setPage((current) => Math.min(totalPages, current + 1))
                      }
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </CardContent>
      </Card>

      <ProjectFormDialog
        open={createOpen}
        mode="create"
        onOpenChange={setCreateOpen}
      />

      <ProjectFormDialog
        open={Boolean(editProject)}
        mode="edit"
        project={editProject}
        onOpenChange={(open) => {
          if (!open) {
            setEditProject(null);
          }
        }}
      />

      <ProjectDetailsDialog
        open={Boolean(viewProjectId)}
        projectId={viewProjectId}
        onOpenChange={(open) => {
          if (!open) {
            setViewProjectId(null);
            deepLink.clearDeepLinkParams();
          }
        }}
        onEdit={(project) => {
          // Defer next dialog so Radix DismissableLayer can clear body pointer-events.
          setViewProjectId(null);
          deepLink.clearDeepLinkParams();
          window.setTimeout(() => setEditProject(project), 50);
        }}
        onDelete={(project) => {
          setViewProjectId(null);
          deepLink.clearDeepLinkParams();
          window.setTimeout(() => setDeleteProject(project), 50);
        }}
      />

      <DeleteProjectDialog
        open={Boolean(deleteProject)}
        project={deleteProject}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteProject(null);
          }
        }}
      />
    </div>
  );
}
