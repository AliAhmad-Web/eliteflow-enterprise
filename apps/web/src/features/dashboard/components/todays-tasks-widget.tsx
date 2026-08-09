"use client";

import type { Task, TaskPriorityValue, TaskStatusValue } from "@enterprise/shared";
import { PERMISSIONS } from "@enterprise/shared";
import { Check, ExternalLink, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { EmptyState } from "@/components/common/feedback/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/constants/routes";
import { useTodaysTasks } from "@/features/dashboard/hooks/use-todays-tasks";
import { useHasPermission } from "@/features/rbac/hooks/use-permissions";
import { useUpdateTask } from "@/features/tasks/hooks/use-task-mutations";
import { ApiClientError } from "@/services/api/api-error";
import { cn } from "@/lib/utils";

const priorityVariant: Record<
  TaskPriorityValue,
  "destructive" | "warning" | "info" | "secondary"
> = {
  CRITICAL: "destructive",
  HIGH: "destructive",
  MEDIUM: "warning",
  LOW: "info",
};

function formatDueTime(dueDate: string | null) {
  if (!dueDate) return "No time";
  const date = new Date(dueDate);
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function priorityLabel(priority: TaskPriorityValue) {
  return priority.toLowerCase();
}

function isCompleted(status: TaskStatusValue) {
  return status === "COMPLETED";
}

interface TodaysTasksWidgetProps {
  title?: string;
  className?: string;
  /** When true, widget self-fetches today's tasks. */
  live?: boolean;
  /** Optional static override (legacy); ignored when live. */
  tasks?: never;
}

export function TodaysTasksWidget({
  title = "Today's Tasks",
  className,
}: TodaysTasksWidgetProps) {
  const router = useRouter();
  const canWrite = useHasPermission(PERMISSIONS.TASKS_WRITE);
  const { tasks, canRead, isLoading, isError, error, refetch, isFetching } =
    useTodaysTasks(8);
  const updateTask = useUpdateTask();

  if (!canRead) {
    return null;
  }

  const toggleTask = async (task: Task) => {
    if (!canWrite || updateTask.isPending) return;
    const completed = isCompleted(task.status);
    await updateTask.mutateAsync({
      id: task.id,
      input: {
        status: completed ? "IN_PROGRESS" : "COMPLETED",
        progress: completed ? Math.min(task.progress ?? 0, 90) : 100,
      },
    });
  };

  const openTask = (taskId: string) => {
    router.push(`${ROUTES.TASKS}?open=${encodeURIComponent(taskId)}`);
  };

  return (
    <Card className={cn("border-border/50 shadow-[var(--shadow-sm)]", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-sm font-semibold tracking-tight">{title}</CardTitle>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
          <Link href={ROUTES.TASKS}>
            View all
            <ExternalLink className="ml-1 size-3" aria-hidden="true" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <div className="space-y-2" aria-busy="true" aria-label="Loading tasks">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : null}

        {isError ? (
          <div className="space-y-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm">
            <p className="text-destructive">
              {error instanceof ApiClientError
                ? error.message
                : "Could not load today's tasks."}
            </p>
            <Button type="button" size="sm" variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : null}

        {!isLoading && !isError && tasks.length === 0 ? (
          <EmptyState
            title="No tasks for today"
            description="Assigned work due today will appear here."
            actionLabel="Open tasks"
            actionHref={ROUTES.TASKS}
            className="min-h-[160px] border-0 bg-transparent py-6"
          />
        ) : null}

        {!isLoading && !isError && tasks.length > 0 ? (
          <ul className="space-y-2" aria-label={title}>
            {tasks.map((task) => {
              const completed = isCompleted(task.status);
              return (
                <li
                  key={task.id}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border border-border/40 bg-muted/15 p-3 transition-colors hover:border-primary/20 hover:bg-accent/50",
                    completed && "opacity-60",
                  )}
                >
                  <button
                    type="button"
                    className={cn(
                      "icon-box icon-box-sm rounded-md border transition-colors",
                      completed
                        ? "border-success bg-success text-success-foreground"
                        : "border-border bg-background hover:border-primary",
                      (!canWrite || updateTask.isPending) && "cursor-not-allowed opacity-70",
                    )}
                    aria-label={
                      completed
                        ? `Mark ${task.title} incomplete`
                        : `Mark ${task.title} complete`
                    }
                    aria-pressed={completed}
                    disabled={!canWrite || updateTask.isPending}
                    onClick={(event) => {
                      event.stopPropagation();
                      void toggleTask(task);
                    }}
                  >
                    {updateTask.isPending && updateTask.variables?.id === task.id ? (
                      <Loader2 className="icon-glyph-sm animate-spin" aria-hidden="true" />
                    ) : completed ? (
                      <Check className="icon-glyph-sm" strokeWidth={2} aria-hidden="true" />
                    ) : null}
                  </button>
                  <button
                    type="button"
                    className="min-w-0 flex-1 space-y-1 text-left"
                    onClick={() => openTask(task.id)}
                  >
                    <p
                      className={cn(
                        "truncate text-sm font-medium leading-5 text-foreground",
                        completed && "line-through",
                      )}
                    >
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={priorityVariant[task.priority]}
                        className="h-5 px-2 text-[10px] leading-none capitalize"
                      >
                        {priorityLabel(task.priority)}
                      </Badge>
                      <span className="text-xs leading-4 text-muted-foreground">
                        {formatDueTime(task.dueDate)}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}

        {isFetching && !isLoading ? (
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Loader2 className="size-3 animate-spin" aria-hidden="true" />
            Updating…
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
