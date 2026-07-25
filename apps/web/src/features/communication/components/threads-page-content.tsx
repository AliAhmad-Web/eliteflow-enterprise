"use client";

import {
  DISCUSSION_THREAD_STATUSES,
  PERMISSIONS,
  type DiscussionReplyDto,
  type DiscussionThreadStatusValue,
} from "@enterprise/shared";
import { CheckCircle2, MessagesSquare, Search } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";

import { EmptyState } from "@/components/common/feedback/empty-state";
import { ErrorState } from "@/components/common/feedback/error-state";
import { SoftContentSkeleton } from "@/components/common/feedback/soft-content-skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useHasPermission } from "@/features/rbac/hooks/use-permissions";
import { cn } from "@/lib/utils";
import { ApiClientError } from "@/services/api/api-error";

import {
  useCreateThread,
  useCreateThreadReply,
  useResolveThread,
  useThread,
  useThreads,
} from "../hooks/use-communication-hub";
import { formatRelativeTime } from "../types/communication.types";

const selectClassName =
  "flex h-10 w-full rounded-lg border border-input bg-background/80 px-3 py-2 text-sm text-foreground shadow-[var(--shadow-xs)] transition-all focus-visible:outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring/50 sm:w-[160px]";

function statusBadgeClass(status: DiscussionThreadStatusValue): string {
  switch (status) {
    case "OPEN":
      return "border-emerald-500/40 text-emerald-700 dark:text-emerald-400";
    case "RESOLVED":
      return "border-border text-muted-foreground";
    case "ARCHIVED":
      return "border-border text-muted-foreground";
    default: {
      const _exhaustive: never = status;
      void _exhaustive;
      return "border-border";
    }
  }
}

function formatError(err: unknown, fallback: string): string {
  if (err instanceof ApiClientError) {
    if (err.errors.length > 0) {
      return err.errors.map((item) => item.message).join(" · ");
    }
    if (err.message && err.message !== "Validation failed") {
      return err.message;
    }
    return "Check the form fields and try again.";
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

export function ThreadsPageContent() {
  const canRead = useHasPermission(PERMISSIONS.COMMUNICATION_READ);
  const canReadChat = useHasPermission(PERMISSIONS.CHAT_READ);
  const canWrite = useHasPermission(PERMISSIONS.COMMUNICATION_WRITE);
  const canWriteChat = useHasPermission(PERMISSIONS.CHAT_WRITE);
  const canManage = useHasPermission(PERMISSIONS.THREAD_MANAGE);
  const allowed = canRead || canReadChat;
  const canCreate = canWrite || canWriteChat || canManage;

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [status, setStatus] = useState<DiscussionThreadStatusValue | "ALL">(
    "ALL",
  );
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const query = useMemo(
    () => ({
      page,
      pageSize: 30,
      search: deferredSearch.trim() || undefined,
      status: status === "ALL" ? undefined : status,
    }),
    [page, deferredSearch, status],
  );

  const listQuery = useThreads(query, allowed);
  const showInitialLoading = listQuery.isLoading && !listQuery.data;
  const items = listQuery.data?.items ?? [];
  const pagination = listQuery.data?.pagination;
  const totalPages = pagination?.totalPages ?? 1;

  if (!allowed) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Threads"
          description="Discussion threads across the workspace."
        />
        <ErrorState
          title="Permission denied"
          description="You do not have access to discussion threads."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-1 pb-8 sm:gap-6">
      <PageHeader
        title="Threads"
        description="Start discussions, reply in context, and resolve when done."
        actionLabel={canCreate ? "New thread" : undefined}
        onAction={canCreate ? () => setCreateOpen(true) : undefined}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-md flex-1">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search threads…"
            className="h-10 pl-9"
            aria-label="Search threads"
          />
        </div>

        <label className="sr-only" htmlFor="thread-status-filter">
          Filter by status
        </label>
        <select
          id="thread-status-filter"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as DiscussionThreadStatusValue | "ALL");
            setPage(1);
          }}
          className={selectClassName}
        >
          <option value="ALL">All statuses</option>
          {DISCUSSION_THREAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </div>

      {listQuery.isError ? (
        <ErrorState
          title="Failed to load threads"
          description="Please try again in a moment."
          onRetry={() => void listQuery.refetch()}
        />
      ) : null}

      {showInitialLoading ? <SoftContentSkeleton rows={6} /> : null}

      {!showInitialLoading && !listQuery.isError && items.length === 0 ? (
        <EmptyState
          icon={MessagesSquare}
          title="No threads yet"
          description="Start a discussion to collaborate with your team."
        />
      ) : null}

      {!showInitialLoading && items.length > 0 ? (
        <div className="rounded-xl border border-border bg-card/40">
          <ul className="divide-y divide-border">
            {items.map((thread) => (
              <li key={thread.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(thread.id)}
                  className="flex w-full flex-col gap-2 px-4 py-3.5 text-left transition-colors hover:bg-accent/40 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">
                        {thread.title}
                      </h3>
                      <Badge
                        variant="outline"
                        className={cn(
                          "h-5 text-[10px] font-medium",
                          statusBadgeClass(thread.status),
                        )}
                      >
                        {thread.status}
                      </Badge>
                      {thread.category ? (
                        <Badge
                          variant="secondary"
                          className="h-5 text-[10px]"
                        >
                          {thread.category}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {thread.body}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>{thread.replyCount ?? 0} replies</span>
                      <time dateTime={thread.updatedAt}>
                        {formatRelativeTime(thread.updatedAt)}
                      </time>
                      {thread.createdBy ? (
                        <span>
                          by {thread.createdBy.firstName}{" "}
                          {thread.createdBy.lastName}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>

          {totalPages > 1 ? (
            <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Page {pagination?.page ?? page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {canCreate ? (
        <CreateThreadDialog open={createOpen} onOpenChange={setCreateOpen} />
      ) : null}

      <ThreadDetailSheet
        threadId={selectedId}
        open={Boolean(selectedId)}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
        canManage={canManage}
        canReply={canCreate}
      />
    </div>
  );
}

function CreateThreadDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createMut = useCreateThread();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setTitle("");
    setBody("");
    setCategory("");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await createMut.mutateAsync({
        title: title.trim(),
        body: body.trim(),
        category: category.trim() || undefined,
        isPinned: false,
      });
      reset();
      onOpenChange(false);
    } catch (err) {
      setError(formatError(err, "Failed to create thread."));
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New thread</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          <div className="space-y-2">
            <Label htmlFor="thread-title" required>
              Title
            </Label>
            <Input
              id="thread-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={300}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="thread-body" required>
              Body
            </Label>
            <Textarea
              id="thread-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              rows={5}
              className="resize-y"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="thread-category">Category (optional)</Label>
            <Input
              id="thread-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              maxLength={100}
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMut.isPending}>
              {createMut.isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ThreadDetailSheet({
  threadId,
  open,
  onOpenChange,
  canManage,
  canReply,
}: {
  threadId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManage: boolean;
  canReply: boolean;
}) {
  const detailQuery = useThread(threadId, open && Boolean(threadId));
  const resolveMut = useResolveThread();
  const replyMut = useCreateThreadReply(threadId ?? "");
  const [replyBody, setReplyBody] = useState("");
  const [replyError, setReplyError] = useState<string | null>(null);

  const thread = detailQuery.data;

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!threadId || !replyBody.trim()) return;
    setReplyError(null);
    try {
      await replyMut.mutateAsync({ body: replyBody.trim() });
      setReplyBody("");
    } catch (err) {
      setReplyError(formatError(err, "Failed to post reply."));
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-lg">
        <SheetHeader className="border-b border-border pb-4 text-left">
          <SheetTitle className="pr-8 text-left">
            {thread?.title ?? "Thread"}
          </SheetTitle>
        </SheetHeader>

        {detailQuery.isLoading && !detailQuery.data ? (
          <div className="py-8">
            <SoftContentSkeleton rows={4} />
          </div>
        ) : null}

        {detailQuery.isError ? (
          <div className="py-6">
            <ErrorState
              title="Failed to load thread"
              description="Please try again."
              onRetry={() => void detailQuery.refetch()}
            />
          </div>
        ) : null}

        {thread ? (
          <div className="flex flex-1 flex-col gap-5 py-4">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "h-5 text-[10px] font-medium",
                    statusBadgeClass(thread.status),
                  )}
                >
                  {thread.status}
                </Badge>
                {thread.category ? (
                  <Badge variant="secondary" className="h-5 text-[10px]">
                    {thread.category}
                  </Badge>
                ) : null}
              </div>
              <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
                {thread.body}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {thread.createdBy ? (
                  <span>
                    {thread.createdBy.firstName} {thread.createdBy.lastName}
                  </span>
                ) : null}
                <time dateTime={thread.createdAt}>
                  {formatRelativeTime(thread.createdAt)}
                </time>
              </div>

              {canManage && thread.status === "OPEN" ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={resolveMut.isPending}
                  onClick={() => void resolveMut.mutate(thread.id)}
                >
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                  {resolveMut.isPending ? "Resolving…" : "Resolve"}
                </Button>
              ) : null}
            </div>

            <div className="space-y-3 border-t border-border pt-4">
              <h3 className="text-sm font-semibold text-foreground">
                Replies ({thread.replyCount ?? thread.replies?.length ?? 0})
              </h3>
              {(thread.replies?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">No replies yet.</p>
              ) : (
                <ul className="space-y-3">
                  {(thread.replies ?? []).map((reply) => (
                    <ReplyNode key={reply.id} reply={reply} depth={0} />
                  ))}
                </ul>
              )}
            </div>

            {canReply && thread.status !== "ARCHIVED" ? (
              <form
                className="mt-auto space-y-3 border-t border-border pt-4"
                onSubmit={(e) => void handleReply(e)}
              >
                <Label htmlFor="thread-reply">Reply</Label>
                <Textarea
                  id="thread-reply"
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  rows={3}
                  placeholder="Write a reply…"
                  className="resize-y"
                  required
                />
                {replyError ? (
                  <p className="text-sm text-destructive" role="alert">
                    {replyError}
                  </p>
                ) : null}
                <Button
                  type="submit"
                  size="sm"
                  disabled={replyMut.isPending || !replyBody.trim()}
                >
                  {replyMut.isPending ? "Posting…" : "Post reply"}
                </Button>
              </form>
            ) : null}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function ReplyNode({
  reply,
  depth,
}: {
  reply: DiscussionReplyDto;
  depth: number;
}) {
  const nested = (reply.replies ?? []) as DiscussionReplyDto[];
  return (
    <li
      className={cn(
        "rounded-lg border border-border/70 bg-background/60 px-3 py-2.5",
        depth > 0 && "ml-3 border-l-2 border-l-border",
      )}
    >
      <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {reply.author ? (
          <span className="font-medium text-foreground">
            {reply.author.firstName} {reply.author.lastName}
          </span>
        ) : null}
        <time dateTime={reply.createdAt}>
          {formatRelativeTime(reply.createdAt)}
        </time>
      </div>
      <p className="whitespace-pre-wrap text-sm text-foreground">{reply.body}</p>
      {nested.length > 0 ? (
        <ul className="mt-2 space-y-2">
          {nested.map((child) => (
            <ReplyNode key={child.id} reply={child} depth={depth + 1} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
