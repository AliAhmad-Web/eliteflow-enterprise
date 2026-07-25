"use client";

import type { Task } from "@enterprise/shared";
import { useState } from "react";

import { ErrorState } from "@/components/common/feedback/error-state";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { ApiClientError } from "@/services/api/api-error";

import { useAddTaskComment } from "../hooks/use-task-mutations";
import { useTask, useTaskActivity } from "../hooks/use-tasks";
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
} from "../types/tasks.types";
import { TaskPriorityBadge } from "./task-priority-badge";
import { TaskStatusBadge } from "./task-status-badge";

interface TaskDetailsDrawerProps {
  open: boolean;
  taskId: string | null;
  onOpenChange: (open: boolean) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  canEditTask?: (task: Task) => boolean;
  canDelete?: boolean;
  canComment?: boolean;
}

export function TaskDetailsDrawer({
  open,
  taskId,
  onOpenChange,
  onEdit,
  onDelete,
  canEditTask,
  canDelete = false,
  canComment = false,
}: TaskDetailsDrawerProps) {
  const taskQuery = useTask(open ? taskId : null);
  const activityQuery = useTaskActivity(open ? taskId : null);
  const commentMutation = useAddTaskComment();
  const [commentBody, setCommentBody] = useState("");

  const task = taskQuery.data;

  const handleComment = async () => {
    if (!taskId || !commentBody.trim()) {
      return;
    }

    try {
      await commentMutation.mutateAsync({
        id: taskId,
        input: { body: commentBody.trim() },
      });
      setCommentBody("");
    } catch {
      // surfaced below
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full max-w-lg overflow-y-auto bg-background p-0 sm:max-w-xl"
      >
        <SheetHeader className="border-b border-border px-6 py-4 text-left">
          <SheetTitle className="pr-8">
            {task?.title ?? "Task details"}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 px-6 py-5">
          {taskQuery.isLoading ? (
            <LoadingState
              label="Loading task"
              className="min-h-[200px] border-0 bg-transparent"
            />
          ) : null}

          {taskQuery.isError ? (
            <ErrorState
              title="Could not load task"
              description={
                taskQuery.error instanceof Error
                  ? taskQuery.error.message
                  : "Please try again."
              }
              onRetry={() => void taskQuery.refetch()}
            />
          ) : null}

          {task ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <TaskStatusBadge status={task.status} />
                <TaskPriorityBadge priority={task.priority} />
                {task.labels.map((label) => (
                  <Badge key={label} variant="outline">
                    {label}
                  </Badge>
                ))}
              </div>

              {task.description ? (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {task.description}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">No description.</p>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <DetailItem label="Project" value={task.projectName ?? "—"} />
                <DetailItem
                  label="Assignee"
                  value={
                    task.assignedTo
                      ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}`
                      : "Unassigned"
                  }
                />
                <DetailItem label="Start" value={task.startDate ?? "—"} />
                <DetailItem label="Due" value={task.dueDate ?? "—"} />
                <DetailItem
                  label="Estimated hours"
                  value={
                    task.estimatedHours != null
                      ? String(task.estimatedHours)
                      : "—"
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
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Progress
                </p>
                <div className="flex items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {task.progress}%
                  </span>
                </div>
              </div>

              {task.attachments.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Attachments
                  </p>
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
                </div>
              ) : null}

              <div className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Comments
                </p>
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
                        <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">
                          {comment.body}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}

                {canComment ? (
                  <div className="space-y-2">
                    <Textarea
                      rows={3}
                      value={commentBody}
                      onChange={(event) => setCommentBody(event.target.value)}
                      placeholder="Add a comment..."
                    />
                    {commentMutation.error instanceof ApiClientError ? (
                      <p className="text-sm text-destructive" role="alert">
                        {commentMutation.error.message}
                      </p>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      isLoading={commentMutation.isPending}
                      disabled={!commentBody.trim()}
                      onClick={() => {
                        void handleComment();
                      }}
                    >
                      Post comment
                    </Button>
                  </div>
                ) : null}
              </div>

              <div className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Activity
                </p>
                {activityQuery.isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading activity…</p>
                ) : null}
                {(activityQuery.data ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No activity yet.</p>
                ) : (
                  <ul className="space-y-2">
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
              </div>

              {((canEditTask?.(task) ?? false) || canDelete) && (
                <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                  {canEditTask?.(task) ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => onEdit?.(task)}
                    >
                      Edit
                    </Button>
                  ) : null}
                  {canDelete ? (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => onDelete?.(task)}
                    >
                      Delete
                    </Button>
                  ) : null}
                </div>
              )}
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
