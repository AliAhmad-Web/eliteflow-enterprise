"use client";

import {
  PERMISSIONS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type ListTasksQueryInput,
  type Task,
  type TaskPriorityValue,
  type TaskStatusValue,
} from "@enterprise/shared";
import {
  AlertTriangle,
  CheckSquare,
  ClipboardList,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useRouter } from "next/navigation";

import { EmptyState } from "@/components/common/feedback/empty-state";
import { ErrorState } from "@/components/common/feedback/error-state";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { taskDetailPath, ROUTES } from "@/constants/routes";
import { useAuthStore } from "@/features/auth/stores/auth.store";
import { OpenedFromNotificationBanner } from "@/features/notifications/components/opened-from-notification-banner";
import { useEntityDeepLink } from "@/features/notifications/hooks/use-entity-deep-link";
import { ClientWorkspaceGate } from "@/features/quotes/components/client-workspace-gate";
import {
  useHasPermission,
  useRole,
} from "@/features/rbac/hooks/use-permissions";
import { FORM_SELECT_CLASS } from "@/lib/form-styles";
import { cn } from "@/lib/utils";
import { ApiClientError } from "@/services/api/api-error";

import { useTaskStats, useTasks } from "../hooks/use-tasks";
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
} from "../types/tasks.types";
import { DeleteTaskDialog } from "./delete-task-dialog";
import { TaskFormDialog } from "./task-form-dialog";
import { TasksTable } from "./tasks-table";

const selectClassName = FORM_SELECT_CLASS;

export function TasksPageContent() {
  return (
    <ClientWorkspaceGate>
      <TasksPageBody />
    </ClientWorkspaceGate>
  );
}

function TasksPageBody() {
  const router = useRouter();
  const { isAdmin, isEmployee, isClient } = useRole();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const hasWrite = useHasPermission(PERMISSIONS.TASKS_WRITE);
  const hasDelete = useHasPermission(PERMISSIONS.TASKS_DELETE);
  const canManage = isAdmin && hasWrite;
  const canDelete = isAdmin && hasDelete;
  const canWriteOwn = isEmployee && hasWrite;

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const debouncedSearch = useDebouncedValue(deferredSearch, 300);
  const [status, setStatus] = useState<TaskStatusValue | "ALL">("ALL");
  const [priority, setPriority] = useState<TaskPriorityValue | "ALL">("ALL");
  const [sortBy, setSortBy] =
    useState<ListTasksQueryInput["sortBy"]>("createdAt");
  const [sortOrder, setSortOrder] =
    useState<ListTasksQueryInput["sortOrder"]>("desc");
  const [page, setPage] = useState(1);
  const limit = 10;

  const [createOpen, setCreateOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [deleteTask, setDeleteTask] = useState<Task | null>(null);

  const deepLink = useEntityDeepLink();

  useEffect(() => {
    if (!deepLink.openId) return;
    router.replace(taskDetailPath(deepLink.openId));
  }, [deepLink.openId, router]);

  const query = useMemo<ListTasksQueryInput>(
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
    useTasks(query);
  const statsQuery = useTaskStats();
  const showInitialLoading = isLoading && !data;

  const handleSort = (field: ListTasksQueryInput["sortBy"]) => {
    if (sortBy === field) {
      setSortOrder((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  const canEditTask = (task: Task) => {
    if (canManage) return true;
    if (canWriteOwn && task.assignedToId === currentUserId) return true;
    return false;
  };

  const tasks = data?.items ?? [];
  const pagination = data?.pagination;
  const totalPages = pagination?.totalPages ?? 1;

  const pageDescription = isClient
    ? "Track delivery tasks on your projects (read-only)."
    : isEmployee
      ? "View and update progress on tasks assigned to you."
      : "Create, assign, and track work across projects with priorities, labels, and activity.";

  return (
    <div className="space-y-6">
      <OpenedFromNotificationBanner
        visible={deepLink.bannerVisible}
        onDismiss={deepLink.dismissBanner}
      />
      <PageHeader
        title="Tasks"
        description={pageDescription}
        actionLabel={canManage ? "Add task" : undefined}
        onAction={canManage ? () => setCreateOpen(true) : undefined}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Total tasks",
            value: statsQuery.data?.total ?? "—",
            icon: CheckSquare,
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
            label: "Blocked",
            value: statsQuery.data?.blocked ?? "—",
            icon: ClipboardList,
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
          { label: "To do", value: statsQuery.data?.todo ?? "—" },
          { label: "Review", value: statsQuery.data?.review ?? "—" },
          { label: "Completed", value: statsQuery.data?.completed ?? "—" },
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
                placeholder="Search tasks, projects, assignees..."
                className="pl-9"
                aria-label="Search tasks"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="task-status-filter" className="sr-only">
                Filter by status
              </label>
              <select
                id="task-status-filter"
                className={cn(selectClassName, "min-w-37.5")}
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value as TaskStatusValue | "ALL");
                  setPage(1);
                }}
              >
                <option value="ALL">All statuses</option>
                {TASK_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {TASK_STATUS_LABELS[value]}
                  </option>
                ))}
              </select>

              <label htmlFor="task-priority-filter" className="sr-only">
                Filter by priority
              </label>
              <select
                id="task-priority-filter"
                className={cn(selectClassName, "min-w-35")}
                value={priority}
                onChange={(event) => {
                  setPriority(
                    event.target.value as TaskPriorityValue | "ALL",
                  );
                  setPage(1);
                }}
              >
                <option value="ALL">All priorities</option>
                {TASK_PRIORITIES.map((value) => (
                  <option key={value} value={value}>
                    {TASK_PRIORITY_LABELS[value]}
                  </option>
                ))}
              </select>

              {canManage ? (
                <Button type="button" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Add task
                </Button>
              ) : null}
            </div>
          </div>

          {showInitialLoading ? (
            <LoadingState label="Loading tasks" className="border-0" />
          ) : null}

          {isError ? (
            (() => {
              const isMfaEnrollment =
                error instanceof ApiClientError &&
                (error.code === "AUTH_MFA_ENROLLMENT_REQUIRED" ||
                  /multi-factor authentication enrollment/i.test(
                    error.message,
                  ));

              if (isMfaEnrollment) {
                return (
                  <ErrorState
                    title="Authenticator MFA required"
                    description={
                      isClient
                        ? "This account is not expected to require admin MFA. Sign out and sign in with your Client Portal account (for example client@eliteflow.dev), then open Tasks again."
                        : "Admin and Super Admin accounts must enroll authenticator MFA before tasks and other privileged APIs are available."
                    }
                    retryLabel="Open Security Center"
                    onRetry={() => router.push(ROUTES.SECURITY)}
                  />
                );
              }

              return (
                <ErrorState
                  title="Could not load tasks"
                  description={
                    error instanceof Error
                      ? error.message
                      : "Please try again in a moment."
                  }
                  onRetry={() => void refetch()}
                />
              );
            })()
          ) : null}

          {!showInitialLoading && !isError ? (
            <>
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <p>
                  {pagination
                    ? `${pagination.total} task${pagination.total === 1 ? "" : "s"}`
                    : null}
                  {isFetching ? " · Refreshing…" : null}
                </p>
              </div>

              {tasks.length === 0 &&
              !deferredSearch &&
              status === "ALL" &&
              priority === "ALL" ? (
                <EmptyState
                  title="No tasks yet"
                  description={
                    canManage
                      ? "Create your first task to assign work and track progress."
                      : "No tasks are available in your current scope."
                  }
                  actionLabel={canManage ? "Add task" : undefined}
                  onAction={canManage ? () => setCreateOpen(true) : undefined}
                />
              ) : (
                <TasksTable
                  tasks={tasks}
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                  onView={(task) => router.push(taskDetailPath(task.id))}
                  onEdit={(task) => setEditTask(task)}
                  onDelete={(task) => setDeleteTask(task)}
                  canEditTask={canEditTask}
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

      <TaskFormDialog
        open={createOpen}
        mode="create"
        variant="full"
        onOpenChange={setCreateOpen}
      />

      <TaskFormDialog
        open={Boolean(editTask)}
        mode="edit"
        variant={
          editTask && canEditTask(editTask) && !canManage
            ? "employee"
            : "full"
        }
        task={editTask}
        onOpenChange={(open) => {
          if (!open) {
            setEditTask(null);
          }
        }}
      />

      <DeleteTaskDialog
        open={Boolean(deleteTask)}
        task={deleteTask}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTask(null);
          }
        }}
      />
    </div>
  );
}
