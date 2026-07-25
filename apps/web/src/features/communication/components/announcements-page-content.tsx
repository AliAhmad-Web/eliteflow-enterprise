"use client";

import {
  ANNOUNCEMENT_PRIORITIES,
  PERMISSIONS,
  type AnnouncementDto,
  type AnnouncementPriorityValue,
} from "@enterprise/shared";
import {
  Check,
  Megaphone,
  Paperclip,
  Pin,
  Search,
} from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { useHasPermission } from "@/features/rbac/hooks/use-permissions";
import { cn } from "@/lib/utils";
import { ApiClientError } from "@/services/api/api-error";

import {
  useAnnouncements,
  useCreateAnnouncement,
  useMarkAnnouncementRead,
} from "../hooks/use-communication-hub";
import { formatRelativeTime } from "../types/communication.types";

const selectClassName =
  "flex h-10 w-full rounded-lg border border-input bg-background/80 px-3 py-2 text-sm text-foreground shadow-[var(--shadow-xs)] transition-all focus-visible:outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring/50 sm:w-[160px]";

function priorityBadgeClass(priority: AnnouncementPriorityValue): string {
  switch (priority) {
    case "URGENT":
      return "border-destructive/40 text-destructive";
    case "HIGH":
      return "border-amber-500/40 text-amber-700 dark:text-amber-400";
    case "LOW":
      return "border-border text-muted-foreground";
    case "NORMAL":
      return "border-border text-foreground";
    default: {
      const _exhaustive: never = priority;
      void _exhaustive;
      return "border-border";
    }
  }
}

function formatCreateError(err: unknown): string {
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
  return "Failed to create announcement.";
}

export function AnnouncementsPageContent() {
  const canRead = useHasPermission(PERMISSIONS.COMMUNICATION_READ);
  const canReadChat = useHasPermission(PERMISSIONS.CHAT_READ);
  const canManage = useHasPermission(PERMISSIONS.ANNOUNCEMENT_MANAGE);
  const allowed = canRead || canReadChat;

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [priority, setPriority] = useState<AnnouncementPriorityValue | "ALL">(
    "ALL",
  );
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  const query = useMemo(
    () => ({
      page,
      pageSize: 30,
      search: deferredSearch.trim() || undefined,
      priority: priority === "ALL" ? undefined : priority,
    }),
    [page, deferredSearch, priority],
  );

  const listQuery = useAnnouncements(query, allowed);
  const showInitialLoading = listQuery.isLoading && !listQuery.data;
  const markRead = useMarkAnnouncementRead();
  const items = listQuery.data?.items ?? [];
  const pagination = listQuery.data?.pagination;
  const totalPages = pagination?.totalPages ?? 1;

  if (!allowed) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Announcements"
          description="Company-wide updates and notices."
        />
        <ErrorState
          title="Permission denied"
          description="You do not have access to announcements."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-1 pb-8 sm:gap-6">
      <PageHeader
        title="Announcements"
        description="Pinned updates, priority notices, and org-wide broadcasts."
        actionLabel={canManage ? "New announcement" : undefined}
        onAction={canManage ? () => setCreateOpen(true) : undefined}
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
            placeholder="Search announcements…"
            className="h-10 pl-9"
            aria-label="Search announcements"
          />
        </div>

        <label className="sr-only" htmlFor="announcement-priority-filter">
          Filter by priority
        </label>
        <select
          id="announcement-priority-filter"
          value={priority}
          onChange={(e) => {
            setPriority(e.target.value as AnnouncementPriorityValue | "ALL");
            setPage(1);
          }}
          className={selectClassName}
        >
          <option value="ALL">All priorities</option>
          {ANNOUNCEMENT_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p.charAt(0) + p.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </div>

      {listQuery.isError ? (
        <ErrorState
          title="Failed to load announcements"
          description="Please try again in a moment."
          onRetry={() => void listQuery.refetch()}
        />
      ) : null}

      {showInitialLoading ? <SoftContentSkeleton rows={6} /> : null}

      {!showInitialLoading && !listQuery.isError && items.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No announcements"
          description="Published announcements will show up here."
        />
      ) : null}

      {!showInitialLoading && items.length > 0 ? (
        <div className="rounded-xl border border-border bg-card/40">
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <AnnouncementRow
                key={item.id}
                item={item}
                marking={markRead.isPending && markRead.variables === item.id}
                onMarkRead={() => void markRead.mutate(item.id)}
              />
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

      {canManage ? (
        <CreateAnnouncementDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
        />
      ) : null}
    </div>
  );
}

function AnnouncementRow({
  item,
  marking,
  onMarkRead,
}: {
  item: AnnouncementDto;
  marking: boolean;
  onMarkRead: () => void;
}) {
  const attachmentCount = item.attachments?.length ?? 0;
  const isUnread = item.isReadByMe === false;

  return (
    <li
      className={cn(
        "flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-start sm:justify-between",
        isUnread && "bg-muted/20",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {item.isPinned ? (
            <Pin className="h-3.5 w-3.5 text-muted-foreground" aria-label="Pinned" />
          ) : null}
          <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
          <Badge
            variant="outline"
            className={cn("h-5 text-[10px] font-medium", priorityBadgeClass(item.priority))}
          >
            {item.priority}
          </Badge>
          {isUnread ? (
            <Badge variant="secondary" className="h-5 text-[10px]">
              Unread
            </Badge>
          ) : null}
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
          {item.body}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {item.publishedAt || item.createdAt ? (
            <time dateTime={item.publishedAt ?? item.createdAt}>
              {formatRelativeTime(item.publishedAt ?? item.createdAt)}
            </time>
          ) : null}
          {item.expiresAt ? (
            <span>Expires {new Date(item.expiresAt).toLocaleDateString()}</span>
          ) : null}
          {attachmentCount > 0 ? (
            <span className="inline-flex items-center gap-1">
              <Paperclip className="h-3.5 w-3.5" aria-hidden />
              {attachmentCount}
            </span>
          ) : null}
          {typeof item.readCount === "number" ? (
            <span>{item.readCount} read</span>
          ) : null}
        </div>
      </div>

      {isUnread ? (
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          disabled={marking}
          onClick={onMarkRead}
        >
          <Check className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          Mark read
        </Button>
      ) : null}
    </li>
  );
}

function CreateAnnouncementDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createMut = useCreateAnnouncement();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] =
    useState<AnnouncementPriorityValue>("NORMAL");
  const [isPinned, setIsPinned] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setTitle("");
    setBody("");
    setPriority("NORMAL");
    setIsPinned(false);
    setExpiresAt("");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await createMut.mutateAsync({
        title: title.trim(),
        body: body.trim(),
        priority,
        isPinned,
        publish: true,
        expiresAt: expiresAt
          ? new Date(expiresAt).toISOString()
          : undefined,
      });
      reset();
      onOpenChange(false);
    } catch (err) {
      setError(formatCreateError(err));
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
          <DialogTitle>New announcement</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          <div className="space-y-2">
            <Label htmlFor="announcement-title" required>
              Title
            </Label>
            <Input
              id="announcement-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={300}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="announcement-body" required>
              Body
            </Label>
            <Textarea
              id="announcement-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              rows={5}
              className="resize-y"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="announcement-priority">Priority</Label>
              <select
                id="announcement-priority"
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value as AnnouncementPriorityValue)
                }
                className={selectClassName}
              >
                {ANNOUNCEMENT_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p.charAt(0) + p.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="announcement-expires">Expires (optional)</Label>
              <Input
                id="announcement-expires"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            Pin to top
          </label>
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
              {createMut.isPending ? "Publishing…" : "Publish"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
