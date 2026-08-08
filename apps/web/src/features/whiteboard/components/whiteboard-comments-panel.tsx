"use client";

import { PERMISSIONS, type WhiteboardCommentDto } from "@enterprise/shared";
import { MessageCircle, Send } from "lucide-react";
import { useState } from "react";

import { EmptyState } from "@/components/common/feedback/empty-state";
import { ErrorState } from "@/components/common/feedback/error-state";
import { Button } from "@/components/ui/button";
import { useHasPermission } from "@/features/rbac/hooks/use-permissions";
import { cn } from "@/lib/utils";
import { ApiClientError, getApiErrorMessage } from "@/services/api/api-error";

import {
  useWhiteboardComments,
  useWhiteboardMutations,
} from "../hooks/use-whiteboards";

interface WhiteboardCommentsPanelProps {
  whiteboardId: string | null;
  className?: string;
}

function formatCommentTime(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function commentsErrorTitle(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.status === 401) return "Sign in required";
    if (error.status === 403) return "Permission denied";
    if (error.status === 404) return "Whiteboard not found";
    if (error.status === 400 || error.code === "VALIDATION_ERROR") {
      return "Invalid request";
    }
  }
  return "Failed to load comments";
}

export function WhiteboardCommentsPanel({
  whiteboardId,
  className,
}: WhiteboardCommentsPanelProps) {
  const canRead = useHasPermission(PERMISSIONS.WHITEBOARDS_READ);
  const canWrite = useHasPermission(PERMISSIONS.WHITEBOARDS_WRITE);
  const { data, isLoading, isError, error, refetch } = useWhiteboardComments(
    whiteboardId,
    canRead && Boolean(whiteboardId),
  );
  const { addComment } = useWhiteboardMutations();

  const [body, setBody] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  if (!canRead) {
    return (
      <div
        className={cn(
          "rounded-xl border border-border/50 bg-card/60 p-3",
          className,
        )}
      >
        <div className="mb-2 flex items-center gap-2 text-sm font-medium">
          <MessageCircle className="size-4" aria-hidden="true" />
          Comments
        </div>
        <p className="text-xs text-muted-foreground">
          You do not have permission to view whiteboard comments.
        </p>
      </div>
    );
  }

  if (!whiteboardId) {
    return (
      <div
        className={cn(
          "rounded-xl border border-border/50 bg-card/60 p-3",
          className,
        )}
      >
        <div className="mb-2 flex items-center gap-2 text-sm font-medium">
          <MessageCircle className="size-4" aria-hidden="true" />
          Comments
        </div>
        <p className="text-xs text-muted-foreground">
          Save or open a whiteboard to view and add comments.
        </p>
      </div>
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    const trimmed = body.trim();
    if (!trimmed) {
      setFormError("Comment cannot be empty.");
      return;
    }
    if (trimmed.length > 4000) {
      setFormError("Comment must be at most 4000 characters.");
      return;
    }
    if (!whiteboardId) return;

    try {
      await addComment.mutateAsync({
        id: whiteboardId,
        input: { body: trimmed },
      });
      setBody("");
    } catch (err) {
      setFormError(
        getApiErrorMessage(err, "Unable to post comment. Please try again."),
      );
    }
  }

  const comments = data ?? [];

  return (
    <div
      className={cn(
        "rounded-xl border border-border/50 bg-card/60 p-3",
        className,
      )}
    >
      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
        <MessageCircle className="size-4" aria-hidden="true" />
        Comments {comments.length > 0 ? `(${comments.length})` : ""}
      </div>

      {isError ? (
        <ErrorState
          title={commentsErrorTitle(error)}
          description={getApiErrorMessage(
            error,
            "Please try again.",
          )}
          onRetry={() => void refetch()}
          className="min-h-28 py-6 sm:min-h-32"
        />
      ) : null}

      {isLoading ? (
        <p className="text-xs text-muted-foreground" aria-live="polite">
          Loading comments…
        </p>
      ) : null}

      {!isLoading && !isError && comments.length === 0 ? (
        <EmptyState
          icon={MessageCircle}
          title="No comments yet"
          description={
            canWrite
              ? "Be the first to leave feedback on this board."
              : undefined
          }
          className="min-h-24"
        />
      ) : null}

      {!isLoading && !isError && comments.length > 0 ? (
        <ul className="mb-3 max-h-56 space-y-2 overflow-y-auto" role="list">
          {comments.map((comment) => (
            <CommentRow key={comment.id} comment={comment} />
          ))}
        </ul>
      ) : null}

      {canWrite ? (
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-2">
          <textarea
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              if (formError) setFormError(null);
            }}
            rows={2}
            maxLength={4000}
            placeholder="Write a comment…"
            aria-label="Whiteboard comment"
            aria-invalid={Boolean(formError)}
            disabled={addComment.isPending}
            className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring disabled:opacity-60"
          />
          {formError ? (
            <p className="text-xs text-destructive" role="alert">
              {formError}
            </p>
          ) : null}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-muted-foreground">
              {body.trim().length}/4000
            </span>
            <Button
              type="submit"
              size="sm"
              disabled={!body.trim() || addComment.isPending}
            >
              <Send aria-hidden="true" />
              {addComment.isPending ? "Posting…" : "Comment"}
            </Button>
          </div>
        </form>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">
          You do not have permission to post comments on this whiteboard.
        </p>
      )}
    </div>
  );
}

function CommentRow({ comment }: { comment: WhiteboardCommentDto }) {
  return (
    <li className="rounded-lg border border-border/40 bg-muted/20 px-2.5 py-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-[11px] font-medium text-muted-foreground">
          {comment.authorId.slice(0, 8)}…
        </span>
        <time
          className="shrink-0 text-[10px] text-muted-foreground"
          dateTime={comment.createdAt}
        >
          {formatCommentTime(comment.createdAt)}
        </time>
      </div>
      <p className="mt-1 whitespace-pre-wrap wrap-break-word text-sm text-foreground">
        {comment.body}
      </p>
      {comment.resolvedAt ? (
        <p className="mt-1 text-[10px] text-muted-foreground">Resolved</p>
      ) : null}
    </li>
  );
}
