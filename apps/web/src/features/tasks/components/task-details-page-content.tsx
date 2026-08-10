"use client";

import type { Task } from "@enterprise/shared";
import { PERMISSIONS } from "@enterprise/shared";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { ErrorState } from "@/components/common/feedback/error-state";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ROUTES } from "@/constants/routes";
import { useAuthStore } from "@/features/auth/stores/auth.store";
import {
  useHasPermission,
  useRole,
} from "@/features/rbac/hooks/use-permissions";
import { ApiClientError } from "@/services/api/api-error";

import { useAddTaskComment } from "../hooks/use-task-mutations";
import { useTask, useTaskActivity } from "../hooks/use-tasks";
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
} from "../types/tasks.types";
import { DeleteTaskDialog } from "./delete-task-dialog";
import { TaskFormDialog } from "./task-form-dialog";
import { TaskPriorityBadge } from "./task-priority-badge";
import { TaskStatusBadge } from "./task-status-badge";

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-foreground break-words">
        {value}
      </p>
    </div>
  );
}

export function TaskDetailsPageContent() {
  const params = useParams<{ id: string }>();
  const taskId = params.id;
  const router = useRouter();

  const { isAdmin, isEmployee, isClient } = useRole();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const hasWrite = useHasPermission(PERMISSIONS.TASKS_WRITE);
  const hasDelete = useHasPermission(PERMISSIONS.TASKS_DELETE);
  const canManage = isAdmin && hasWrite;
  const canDelete = isAdmin && hasDelete;
  const canWriteOwn = isEmployee && hasWrite;
  const canComment = isClient || ((isAdmin || isEmployee) && hasWrite);

  const taskQuery = useTask(taskId);
  const activityQuery = useTaskActivity(taskId);
  const commentMutation = useAddTaskComment();
  const [commentBody, setCommentBody] = useState("");
  const [commentSuccess, setCommentSuccess] = useState<string | null>(null);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [deleteTask, setDeleteTask] = useState<Task | null>(null);

  const task = taskQuery.data;

  const canEditTask = (item: Task) => {
    if (canManage) return true;
    if (canWriteOwn && item.assignedToId === currentUserId) return true;
    return false;
  };

  const handleComment = async () => {
    if (!taskId || !commentBody.trim() || commentMutation.isPending) return;
    setCommentSuccess(null);
    try {
      await commentMutation.mutateAsync({
        id: taskId,
        input: { body: commentBody.trim() },
      });
      setCommentBody("");
      setCommentSuccess(
        isClient
          ? "Feedback submitted successfully."
          : "Comment posted successfully.",
      );
    } catch {
      // surfaced below
    }
  };

  if (taskQuery.isLoading) {
    return <LoadingState label="Loading task" />;
  }

  if (taskQuery.isError || !task) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
          <Link href={ROUTES.TASKS}>
            <ArrowLeft className="mr-2 size-4" aria-hidden />
            Back to tasks
          </Link>
        </Button>
        <ErrorState
          title="Could not load task"
          description={
            taskQuery.error instanceof Error
              ? taskQuery.error.message
              : "This task may have been deleted or you lack access."
          }
          onRetry={() => void taskQuery.refetch()}
        />
      </div>
    );
  }

  const editable = canEditTask(task);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
          <Link href={ROUTES.TASKS}>
            <ArrowLeft className="mr-2 size-4" aria-hidden />
            Back to tasks
          </Link>
        </Button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <PageHeader
            title={task.title}
            description={task.projectName ?? "Task details"}
          />
          <div className="flex flex-wrap gap-2">
            {editable ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditTask(task)}
              >
                <Pencil className="mr-2 size-4" aria-hidden />
                Edit
              </Button>
            ) : null}
            {canDelete ? (
              <Button
                type="button"
                variant="destructive"
                onClick={() => setDeleteTask(task)}
              >
                <Trash2 className="mr-2 size-4" aria-hidden />
                Delete
              </Button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <TaskStatusBadge status={task.status} />
          <TaskPriorityBadge priority={task.priority} />
          {task.labels.map((label) => (
            <Badge key={label} variant="outline">
              {label}
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Description</CardTitle>
            </CardHeader>
            <CardContent>
              {task.description ? (
                <p className="whitespace-pre-wrap text-sm text-foreground/90">
                  {task.description}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">No description.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
                <span className="text-sm font-semibold tabular-nums">
                  {task.progress}%
                </span>
              </div>
            </CardContent>
          </Card>

          {task.attachments.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Attachments</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {task.attachments.map((attachment) => (
                    <li key={attachment.id}>
                      <a
                        href={attachment.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        {attachment.fileName}
                      </a>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Comments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(task.comments ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No comments yet.</p>
              ) : (
                <ul className="space-y-3">
                  {(task.comments ?? []).map((comment) => (
                    <li
                      key={comment.id}
                      className="rounded-lg border border-border/50 bg-muted/20 p-3"
                    >
                      <p className="text-xs text-muted-foreground">
                        {comment.authorFirstName} {comment.authorLastName} ·{" "}
                        {new Date(comment.createdAt).toLocaleString()}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                        {comment.body}
                      </p>
                    </li>
                  ))}
                </ul>
              )}

              {canComment ? (
                <div className="space-y-2 border-t border-border pt-4">
                  <Textarea
                    rows={3}
                    value={commentBody}
                    onChange={(event) => {
                      setCommentBody(event.target.value);
                      if (commentSuccess) setCommentSuccess(null);
                    }}
                    placeholder={
                      isClient
                        ? "Share feedback or a change request…"
                        : "Add a comment..."
                    }
                    disabled={commentMutation.isPending}
                  />
                  {commentMutation.error instanceof ApiClientError ? (
                    <p className="text-sm text-destructive" role="alert">
                      {commentMutation.error.message}
                    </p>
                  ) : null}
                  {commentSuccess ? (
                    <p
                      className="text-sm text-emerald-700 dark:text-emerald-400"
                      role="status"
                    >
                      {commentSuccess}
                    </p>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    isLoading={commentMutation.isPending}
                    disabled={!commentBody.trim() || commentMutation.isPending}
                    onClick={() => {
                      void handleComment();
                    }}
                  >
                    {isClient ? "Submit feedback" : "Post comment"}
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {activityQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">
                  Loading activity…
                </p>
              ) : null}
              {(activityQuery.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity yet.</p>
              ) : (
                <ul className="space-y-3">
                  {(activityQuery.data ?? []).map((entry) => (
                    <li
                      key={entry.id}
                      className="border-l-2 border-border pl-3 text-sm"
                    >
                      <p className="text-foreground">{entry.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.actorFirstName
                          ? `${entry.actorFirstName} ${entry.actorLastName ?? ""}`
                          : "System"}{" "}
                        · {new Date(entry.createdAt).toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Overview</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <DetailItem label="Project" value={task.projectName ?? "—"} />
              <DetailItem
                label="Assignee"
                value={
                  task.assignedTo
                    ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}`
                    : "Unassigned"
                }
              />
              <DetailItem
                label="Status"
                value={TASK_STATUS_LABELS[task.status]}
              />
              <DetailItem
                label="Priority"
                value={TASK_PRIORITY_LABELS[task.priority]}
              />
              <DetailItem label="Start date" value={task.startDate ?? "—"} />
              <DetailItem label="Due date" value={task.dueDate ?? "—"} />
              <DetailItem
                label="Estimated hours"
                value={
                  task.estimatedHours != null
                    ? String(task.estimatedHours)
                    : "—"
                }
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <TaskFormDialog
        open={Boolean(editTask)}
        mode="edit"
        variant={editable && !canManage ? "employee" : "full"}
        task={editTask}
        onOpenChange={(open) => {
          if (!open) setEditTask(null);
        }}
      />

      <DeleteTaskDialog
        open={Boolean(deleteTask)}
        task={deleteTask}
        onOpenChange={(open) => {
          if (!open) setDeleteTask(null);
        }}
        onDeleted={() => {
          router.push(ROUTES.TASKS);
        }}
      />
    </div>
  );
}
