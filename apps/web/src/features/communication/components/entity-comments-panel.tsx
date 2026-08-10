"use client";

import type {
  CommentDto,
  CommentEntityTypeValue,
} from "@enterprise/shared";
import { FILES_API_PREFIX, PERMISSIONS } from "@enterprise/shared";
import {
  Edit3,
  MessageCircle,
  Paperclip,
  Reply,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { EmptyState } from "@/components/common/feedback/empty-state";
import { ErrorState } from "@/components/common/feedback/error-state";
import { Button } from "@/components/ui/button";
import { useHasPermission } from "@/features/rbac/hooks/use-permissions";
import { filesService } from "@/features/files/services/files.service";
import { getApiBaseUrl } from "@/services/api/api-error";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/features/auth/stores/auth.store";

import { useComments } from "../hooks/use-communication";
import {
  useCreateComment,
  useDeleteComment,
  useUpdateComment,
} from "../hooks/use-communication-mutations";
import { formatRelativeTime } from "../types/communication.types";
import { CommentsPanelSkeleton } from "./communication-skeletons";

interface EntityCommentsPanelProps {
  entityType: CommentEntityTypeValue;
  entityId: string;
  className?: string;
}

type PendingAttachment = {
  fileName: string;
  fileUrl: string;
  managedFileId: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
};

export function EntityCommentsPanel({
  entityType,
  entityId,
  className,
}: EntityCommentsPanelProps) {
  const canRead = useHasPermission(PERMISSIONS.CHAT_READ);
  const canWrite = useHasPermission(PERMISSIONS.CHAT_WRITE);
  const canUpload = useHasPermission(PERMISSIONS.FILES_UPLOAD);
  const currentUserId = useAuthStore((s) => s.user?.id ?? "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const query = { entityType, entityId, page: 1, pageSize: 30 };

  const { data, isLoading, isError, refetch } = useComments(query, canRead);
  const createMut = useCreateComment(query);
  const updateMut = useUpdateComment(entityType, entityId);
  const deleteMut = useDeleteComment(entityType, entityId);

  const [newBody, setNewBody] = useState("");
  const [replyTo, setReplyTo] = useState<CommentDto | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingAttachments, setPendingAttachments] = useState<
    PendingAttachment[]
  >([]);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const topLevelComments = (data?.items ?? []).filter((c) => !c.parentId);

  async function handleAttachFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    setAttachError(null);
    if (!canUpload) {
      setAttachError("File upload permission is required to attach files.");
      return;
    }
    setUploading(true);
    try {
      for (const file of [...fileList]) {
        const uploaded = await filesService.uploadFiles({ files: [file] });
        const managed = uploaded[0];
        if (!managed) {
          throw new Error(`Upload failed for ${file.name}`);
        }
        setPendingAttachments((prev) => [
          ...prev,
          {
            fileName: managed.originalName || managed.name || file.name,
            fileUrl: `${getApiBaseUrl()}${FILES_API_PREFIX}/${managed.id}/download`,
            managedFileId: managed.id,
            mimeType: managed.mimeType ?? file.type,
            sizeBytes: managed.sizeBytes ?? file.size,
          },
        ]);
      }
    } catch (err) {
      setAttachError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const body = newBody.trim();
    if (!body) return;
    if (uploading) {
      setAttachError("Wait for uploads to finish.");
      return;
    }

    await createMut.mutateAsync({
      entityType,
      entityId,
      body,
      parentId: replyTo?.id ?? null,
      attachments: pendingAttachments.length
        ? pendingAttachments
        : undefined,
    });

    setNewBody("");
    setReplyTo(null);
    setPendingAttachments([]);
    setAttachError(null);
  }

  async function handleUpdate(id: string, body: string) {
    await updateMut.mutateAsync({ id, input: { body: body.trim() } });
    setEditingId(null);
  }

  if (!canRead) return null;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-center gap-2">
        <MessageCircle className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">
          Comments {data ? `(${data.items.length})` : ""}
        </h3>
      </div>

      {isError && (
        <ErrorState
          title="Failed to load comments"
          description="Please try again."
          onRetry={() => void refetch()}
        />
      )}

      {isLoading && <CommentsPanelSkeleton />}

      {/* Comment list */}
      {!isLoading && topLevelComments.length === 0 && (
        <EmptyState
          icon={MessageCircle}
          title="No comments yet"
          description={canWrite ? "Be the first to comment." : undefined}
          className="min-h-30"
        />
      )}

      {topLevelComments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          currentUserId={currentUserId}
          canWrite={canWrite}
          editingId={editingId}
          onEdit={(c) => {
            setEditingId(c.id);
          }}
          onCancelEdit={() => setEditingId(null)}
          onSaveEdit={handleUpdate}
          onDelete={(id) => {
            if (window.confirm("Delete this comment?")) {
              void deleteMut.mutate(id);
            }
          }}
          onReply={(c) => {
            setReplyTo(c);
          }}
          isEditPending={updateMut.isPending}
        />
      ))}

      {/* Composer */}
      {canWrite && (
        <form onSubmit={handleCreate} className="space-y-2">
          {/* Reply indicator */}
          {replyTo && (
            <div className="flex items-center gap-2 rounded border border-border bg-muted/40 px-2 py-1 text-xs">
              <span className="flex-1 truncate text-muted-foreground">
                Replying to {replyTo.author?.firstName ?? "comment"}
              </span>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          {pendingAttachments.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {pendingAttachments.map((att) => (
                <div
                  key={att.managedFileId}
                  className="flex items-center gap-1 rounded border border-border bg-muted/40 px-2 py-0.5 text-xs"
                >
                  <Paperclip className="h-3 w-3 text-muted-foreground" />
                  <span className="max-w-25 truncate">{att.fileName}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setPendingAttachments((prev) =>
                        prev.filter((p) => p.managedFileId !== att.managedFileId),
                      )
                    }
                    className="ml-0.5 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {attachError ? (
            <p className="text-xs text-destructive">{attachError}</p>
          ) : null}

          <div className="flex gap-2">
            <textarea
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleCreate(e as unknown as React.FormEvent);
                }
              }}
              placeholder={
                replyTo
                  ? `Reply to ${replyTo.author?.firstName ?? "comment"}…`
                  : "Write a comment…"
              }
              rows={2}
              className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                multiple
                onChange={(e) => void handleAttachFiles(e.target.files)}
              />
              <button
                type="button"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                disabled={uploading || !canUpload}
                onClick={() => fileInputRef.current?.click()}
                title={
                  canUpload
                    ? "Attach via File Manager upload"
                    : "Upload permission required"
                }
              >
                <Paperclip className="h-3.5 w-3.5" />
                {uploading ? "Uploading…" : "Attach"}
              </button>
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={!newBody.trim() || createMut.isPending || uploading}
            >
              {createMut.isPending ? "Posting…" : replyTo ? "Reply" : "Comment"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Individual comment item
// ---------------------------------------------------------------------------
function CommentItem({
  comment,
  currentUserId,
  canWrite,
  editingId,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onReply,
  isEditPending,
  depth = 0,
}: {
  comment: CommentDto;
  currentUserId: string;
  canWrite: boolean;
  editingId: string | null;
  onEdit: (c: CommentDto) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: string, body: string) => void;
  onDelete: (id: string) => void;
  onReply: (c: CommentDto) => void;
  isEditPending: boolean;
  depth?: number;
}) {
  const isOwn = comment.authorId === currentUserId;
  const isEditing = editingId === comment.id;
  const [localEditBody, setLocalEditBody] = useState(comment.body);

  useEffect(() => {
    if (isEditing) {
      setLocalEditBody(comment.body);
    }
  }, [isEditing, comment.body]);

  return (
    <div className={cn("flex gap-3", depth > 0 && "ml-8 mt-2")}>
      {/* Avatar */}
      <div className="mt-0.5 h-7 w-7 shrink-0 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
        {(comment.author?.firstName?.[0] ?? "?").toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-semibold text-foreground">
            {comment.author
              ? `${comment.author.firstName} ${comment.author.lastName}`
              : "Unknown"}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {formatRelativeTime(comment.createdAt)}
          </span>
          {comment.createdAt !== comment.updatedAt && (
            <span className="text-[10px] italic text-muted-foreground">(edited)</span>
          )}
        </div>

        {/* Body */}
        {isEditing ? (
          <div className="mt-1 flex gap-1.5 items-end">
            <textarea
              className="flex-1 resize-none rounded-lg border border-input bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
              rows={2}
              value={localEditBody}
              onChange={(e) => setLocalEditBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSaveEdit(comment.id, localEditBody);
                }
                if (e.key === "Escape") onCancelEdit();
              }}
              autoFocus
            />
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={() => onSaveEdit(comment.id, localEditBody)}
              disabled={isEditPending}
            >
              Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={onCancelEdit}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <p className="mt-0.5 text-sm text-foreground whitespace-pre-wrap wrap-break-word">
            {comment.body}
          </p>
        )}

        {/* Attachments */}
        {(comment.attachments?.length ?? 0) > 0 && (
          <div className="mt-1 space-y-0.5">
            {comment.attachments!.map((att) => (
              <a
                key={att.id}
                href={att.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary underline hover:no-underline"
              >
                <Paperclip className="h-3 w-3" />
                {att.fileName}
              </a>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="mt-1 flex items-center gap-3">
          {canWrite && depth === 0 && (
            <button
              type="button"
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => onReply(comment)}
            >
              <Reply className="h-3 w-3" />
              Reply
            </button>
          )}
          {isOwn && canWrite && (
            <>
              <button
                type="button"
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => onEdit(comment)}
              >
                <Edit3 className="h-3 w-3" />
                Edit
              </button>
              <button
                type="button"
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive transition-colors"
                onClick={() => onDelete(comment.id)}
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </button>
            </>
          )}
        </div>

        {/* Nested replies */}
        {(comment.replies?.length ?? 0) > 0 && (
          <div className="mt-2 space-y-2">
            {(comment.replies as CommentDto[]).map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                currentUserId={currentUserId}
                canWrite={canWrite}
                editingId={editingId}
                onEdit={onEdit}
                onCancelEdit={onCancelEdit}
                onSaveEdit={onSaveEdit}
                onDelete={onDelete}
                onReply={onReply}
                isEditPending={isEditPending}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
