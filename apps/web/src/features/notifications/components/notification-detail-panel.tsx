"use client";

import type { Notification } from "@enterprise/shared";
import {
  Archive,
  CheckCheck,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Link2,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Reply,
  Send,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  createElement,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/features/auth/stores/auth.store";
import { cn } from "@/lib/utils";

import {
  useCreateNotificationReply,
  useDeleteNotificationReply,
} from "../hooks/use-notifications-mutations";
import { useNotificationReplies } from "../hooks/use-notifications";
import { CATEGORY_LABELS } from "../types/notifications.types";
import { buildEntityDeepLink } from "../utils/notification-deep-link";
import {
  buildRelatedRecord,
  buildShareableNotificationLink,
  buildTimelineEvents,
  formatDetailTimestamp,
  getCategoryAccentClass,
  getCategoryIcon,
  getMetadataRows,
  getPriorityBadgeVariant,
  getPriorityLabel,
  parseNotificationMetadata,
  resolveSender,
} from "../utils/notification-detail.utils";

export interface NotificationDetailPanelProps {
  notification: Notification | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMarkRead: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  isMarkingRead?: boolean;
  isArchiving?: boolean;
  isDeleting?: boolean;
}

export function NotificationDetailPanel({
  notification,
  open,
  onOpenChange,
  onMarkRead,
  onArchive,
  onDelete,
  isMarkingRead = false,
  isArchiving = false,
  isDeleting = false,
}: NotificationDetailPanelProps) {
  const titleId = useId();
  const replyRef = useRef<HTMLTextAreaElement>(null);
  const repliesEndRef = useRef<HTMLDivElement>(null);
  const [reply, setReply] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [replyHint, setReplyHint] = useState<string | null>(null);
  const currentUserId = useAuthStore((state) => state.user?.id);

  const repliesQuery = useNotificationReplies(
    open ? notification?.id ?? null : null,
    open && Boolean(notification?.id),
  );
  const createReply = useCreateNotificationReply(notification?.id ?? "");
  const deleteReply = useDeleteNotificationReply(notification?.id ?? "");

  useEffect(() => {
    setReply("");
    setReplyHint(null);
    setCopyState("idle");
  }, [notification?.id]);

  useEffect(() => {
    if (repliesQuery.data?.items?.length) {
      repliesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [repliesQuery.data?.items?.length]);

  const meta = useMemo(
    () => parseNotificationMetadata(notification?.metadata),
    [notification?.metadata],
  );

  const related = useMemo(
    () => (notification ? buildRelatedRecord(notification, meta) : null),
    [notification, meta],
  );

  const timeline = useMemo(
    () => (notification ? buildTimelineEvents(notification, meta) : []),
    [notification, meta],
  );

  const sender = useMemo(
    () => (notification ? resolveSender(notification, meta) : null),
    [notification, meta],
  );

  const timestamps = useMemo(
    () =>
      notification ? formatDetailTimestamp(notification.createdAt) : null,
    [notification],
  );

  const priorityLabel = notification
    ? getPriorityLabel(notification.priority)
    : "Medium";

  const metadataRows = useMemo(
    () => getMetadataRows(meta, priorityLabel),
    [meta, priorityLabel],
  );

  const categoryIcon = notification
    ? getCategoryIcon(notification.category)
    : FileText;

  const closePanel = useCallback(() => onOpenChange(false), [onOpenChange]);

  const handleCopyLink = useCallback(async () => {
    if (!notification) return;
    const url = buildShareableNotificationLink(notification.id);
    try {
      await navigator.clipboard.writeText(url);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setCopyState("idle");
    }
  }, [notification]);

  const handleReplySubmit = useCallback(() => {
    if (!notification || !reply.trim() || createReply.isPending) return;
    const message = reply.trim();
    createReply.mutate(message, {
      onSuccess: (created) => {
        setReply("");
        if (created.syncedCommentId) {
          setReplyHint("Reply posted and synced to the related discussion.");
        } else if (created.syncedEntityType) {
          setReplyHint(
            `Reply saved on this notification thread (${created.syncedEntityType}).`,
          );
        } else {
          setReplyHint("Reply posted.");
        }
      },
      onError: () => {
        setReplyHint("Could not post reply. Please try again.");
      },
    });
  }, [notification, reply, createReply]);

  const discussHref = notification
    ? buildEntityDeepLink(notification, { actionType: "discuss" })
    : null;

  const focusReply = useCallback(() => {
    replyRef.current?.focus();
    replyRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        aria-labelledby={titleId}
        className={cn(
          "flex w-full flex-col gap-0 border-l border-border/80 bg-background p-0",
          "shadow-2xl sm:max-w-140",
          "data-[state=open]:duration-300 data-[state=closed]:duration-200",
          "[&>button]:hidden",
        )}
      >
        {notification && sender && timestamps && related ? (
          <>
            <SheetTitle id={titleId} className="sr-only">
              {notification.title}
            </SheetTitle>

            {/* Header */}
            <header className="relative shrink-0 border-b border-border/70 bg-linear-to-b from-muted/40 to-background px-5 pb-5 pt-5 sm:px-6">
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-sm ring-1 ring-border/60 transition-transform duration-300",
                    "group-data-[state=open]:scale-100",
                    getCategoryAccentClass(notification.category),
                  )}
                  aria-hidden
                >
                  {createElement(categoryIcon, {
                    className: "h-7 w-7",
                    strokeWidth: 1.75,
                  })}
                </div>

                <div className="min-w-0 flex-1 space-y-2.5 pr-16">
                  <h2 className="text-balance text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                    {notification.title}
                  </h2>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={getPriorityBadgeVariant(notification.priority)}
                      className="uppercase tracking-wide"
                    >
                      {priorityLabel}
                    </Badge>
                    <Badge variant="outline" className="font-medium">
                      {CATEGORY_LABELS[notification.category]}
                    </Badge>
                    {!notification.isRead ? (
                      <Badge variant="default" className="font-medium">
                        Unread
                      </Badge>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="font-medium text-foreground/80">
                        {sender.label}
                      </span>
                      <span className="text-muted-foreground/70">
                        · {sender.kind}
                      </span>
                    </span>
                    <span className="hidden h-1 w-1 rounded-full bg-border sm:inline-block" />
                    <time dateTime={notification.createdAt}>
                      {timestamps.relative}
                    </time>
                    <span className="text-muted-foreground/70">
                      · {timestamps.absolute}
                    </span>
                  </div>
                </div>

                <div className="absolute right-4 top-4 flex items-center gap-1 sm:right-5">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="More notification actions"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {related.href ? (
                        <DropdownMenuItem asChild>
                          <Link href={related.href}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Open related
                          </Link>
                        </DropdownMenuItem>
                      ) : null}
                      {!notification.isRead ? (
                        <DropdownMenuItem
                          disabled={isMarkingRead}
                          onClick={() => onMarkRead(notification.id)}
                        >
                          <CheckCheck className="mr-2 h-4 w-4" />
                          Mark as read
                        </DropdownMenuItem>
                      ) : null}
                      <DropdownMenuItem onClick={() => void handleCopyLink()}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy link
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={focusReply}>
                        <Reply className="mr-2 h-4 w-4" />
                        Reply
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        disabled={isArchiving || notification.isArchived}
                        onClick={() => {
                          onArchive(notification.id);
                          closePanel();
                        }}
                      >
                        <Archive className="mr-2 h-4 w-4" />
                        Archive
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        disabled={isDeleting}
                        onClick={() => {
                          onDelete(notification.id);
                          closePanel();
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Close notification detail"
                    onClick={closePanel}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </header>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
              <div className="space-y-6 animate-in fade-in-0 slide-in-from-right-2 duration-300">
                {/* Message card */}
                <section
                  aria-label="Notification message"
                  className="rounded-2xl border border-border/80 bg-card/60 p-4 shadow-sm ring-1 ring-black/5 transition-shadow hover:shadow-md dark:ring-white/5 sm:p-5"
                >
                  <p className="text-[15px] leading-relaxed text-foreground">
                    {notification.body}
                  </p>

                  {metadataRows.length > 1 || meta.progress !== undefined ? (
                    <>
                      <Separator className="my-4" />
                      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {metadataRows.map((row) => (
                          <div key={row.label} className="min-w-0">
                            <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                              {row.label}
                            </dt>
                            <dd className="mt-0.5 truncate text-sm font-medium text-foreground">
                              {row.value}
                            </dd>
                          </div>
                        ))}
                      </dl>
                      {typeof meta.progress === "number" ? (
                        <div className="mt-4 space-y-2">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Progress</span>
                            <span className="font-medium text-foreground">
                              {Math.round(
                                Math.min(100, Math.max(0, meta.progress)),
                              )}
                              %
                            </span>
                          </div>
                          <div
                            className="h-2 overflow-hidden rounded-full bg-muted"
                            role="progressbar"
                            aria-valuenow={Math.round(
                              Math.min(100, Math.max(0, meta.progress)),
                            )}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label="Task progress"
                          >
                            <div
                              className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                              style={{
                                width: `${Math.min(100, Math.max(0, meta.progress))}%`,
                              }}
                            />
                          </div>
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </section>

                {/* Related record */}
                <section aria-label="Related record" className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Related record
                  </h3>
                  {related.kind === "none" ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-muted/20 px-6 py-10 text-center">
                      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground">
                        <Link2 className="h-6 w-6" strokeWidth={1.5} />
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        No related record available.
                      </p>
                      <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                        This alert is informational and is not linked to a task,
                        project, or document.
                      </p>
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "group relative overflow-hidden rounded-2xl border border-border/80 bg-card/50 p-4",
                        "shadow-sm ring-1 ring-black/5 transition-all duration-200",
                        "hover:-translate-y-0.5 hover:border-border hover:shadow-md dark:ring-white/5",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                            getCategoryAccentClass(notification.category),
                          )}
                        >
                          <related.icon className="h-5 w-5" strokeWidth={1.75} />
                        </div>
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {related.title}
                            </p>
                            {related.status ? (
                              <Badge variant="secondary" className="text-[10px]">
                                {related.status}
                              </Badge>
                            ) : null}
                            <Badge variant="outline" className="text-[10px]">
                              {priorityLabel}
                            </Badge>
                          </div>
                          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                            {related.description}
                          </p>
                          <dl className="grid grid-cols-2 gap-2 text-[11px]">
                            {meta.assignedTo ? (
                              <div>
                                <dt className="text-muted-foreground">Owner</dt>
                                <dd className="font-medium text-foreground">
                                  {meta.assignedTo}
                                </dd>
                              </div>
                            ) : null}
                            {meta.assignedBy ? (
                              <div>
                                <dt className="text-muted-foreground">Assigned by</dt>
                                <dd className="font-medium text-foreground">
                                  {meta.assignedBy}
                                </dd>
                              </div>
                            ) : null}
                            {meta.dueDate ? (
                              <div>
                                <dt className="text-muted-foreground">Due date</dt>
                                <dd className="font-medium text-foreground">
                                  {meta.dueDate}
                                </dd>
                              </div>
                            ) : null}
                            {meta.project ? (
                              <div>
                                <dt className="text-muted-foreground">Project</dt>
                                <dd className="truncate font-medium text-foreground">
                                  {meta.project}
                                </dd>
                              </div>
                            ) : null}
                          </dl>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {related.href ? (
                              <Button asChild size="sm">
                                <Link href={related.href}>
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  Open Full Record
                                </Link>
                              </Button>
                            ) : null}
                            {discussHref ? (
                              <Button asChild size="sm" variant="outline">
                                <Link href={discussHref}>
                                  <MessageSquare className="h-3.5 w-3.5" />
                                  Open Discussion
                                </Link>
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </section>

                {/* Timeline */}
                <section aria-label="Activity timeline" className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Activity
                  </h3>
                  <ol className="relative space-y-0 border-l border-border/80 ml-3">
                    {timeline.map((event, index) => {
                      const stamp = formatDetailTimestamp(event.at);
                      return (
                        <li
                          key={event.id}
                          className="relative pb-5 pl-5 last:pb-0"
                        >
                          <span
                            className={cn(
                              "absolute -left-1.25 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background",
                              index === timeline.length - 1
                                ? "bg-primary"
                                : "bg-muted-foreground/40",
                            )}
                            aria-hidden
                          />
                          <p className="text-sm font-medium text-foreground">
                            {event.label}
                          </p>
                          {event.description ? (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {event.description}
                            </p>
                          ) : null}
                          <time
                            className="mt-1 block text-[11px] text-muted-foreground/80"
                            dateTime={event.at}
                          >
                            {stamp.relative} · {stamp.absolute}
                          </time>
                        </li>
                      );
                    })}
                  </ol>
                </section>

                {/* Attachments */}
                <section aria-label="Attachments" className="space-y-3">
                  <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Paperclip className="h-3.5 w-3.5" />
                    Attachments
                  </h3>
                  {meta.attachments && meta.attachments.length > 0 ? (
                    <ul className="space-y-2">
                      {meta.attachments.map((file, index) => (
                        <li
                          key={file.id ?? `${file.name}-${index}`}
                          className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5 transition-colors hover:bg-muted/40"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground ring-1 ring-border/60">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {file.name}
                            </p>
                            {file.size ? (
                              <p className="text-[11px] text-muted-foreground">
                                {file.size}
                              </p>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            {file.url ? (
                              <>
                                <Button
                                  asChild
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={`Preview ${file.name}`}
                                >
                                  <a
                                    href={file.url}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                </Button>
                                <Button
                                  asChild
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={`Download ${file.name}`}
                                >
                                  <a href={file.url} download>
                                    <Download className="h-4 w-4" />
                                  </a>
                                </Button>
                              </>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">
                                Unavailable
                              </span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="rounded-xl border border-dashed border-border/70 px-4 py-6 text-center text-xs text-muted-foreground">
                      No attachments on this notification.
                    </p>
                  )}
                </section>

                {/* Comments / threaded replies */}
                <section aria-label="Replies" className="space-y-3">
                  <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Replies
                    {repliesQuery.data?.items?.length ? (
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium normal-case tracking-normal text-muted-foreground">
                        {repliesQuery.data.items.length}
                      </span>
                    ) : null}
                  </h3>

                  {repliesQuery.isLoading ? (
                    <p className="text-xs text-muted-foreground">Loading replies…</p>
                  ) : repliesQuery.isError ? (
                    <p className="text-xs text-destructive">
                      Could not load replies.{" "}
                      <button
                        type="button"
                        className="underline"
                        onClick={() => void repliesQuery.refetch()}
                      >
                        Retry
                      </button>
                    </p>
                  ) : (repliesQuery.data?.items?.length ?? 0) > 0 ? (
                    <ul className="max-h-64 space-y-3 overflow-y-auto pr-1">
                      {repliesQuery.data!.items.map((item) => {
                        const initials =
                          `${item.author.firstName.charAt(0)}${item.author.lastName.charAt(0)}`.toUpperCase();
                        return (
                          <li
                            key={item.id}
                            className="rounded-xl border border-border/70 bg-card/40 px-3.5 py-3"
                          >
                            <div className="flex items-start gap-2.5">
                              {item.author.avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={item.author.avatarUrl}
                                  alt=""
                                  className="h-8 w-8 rounded-full object-cover"
                                />
                              ) : (
                                <div
                                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary"
                                  aria-hidden
                                >
                                  {initials}
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="truncate text-xs font-semibold text-foreground">
                                    {item.author.firstName} {item.author.lastName}
                                  </p>
                                  <time
                                    className="shrink-0 text-[10px] text-muted-foreground"
                                    dateTime={item.createdAt}
                                  >
                                    {formatDetailTimestamp(item.createdAt).relative}
                                  </time>
                                </div>
                                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                                  {item.message}
                                </p>
                                {item.syncedCommentId ? (
                                  <p className="mt-1 text-[10px] text-muted-foreground/80">
                                    Synced to {item.syncedEntityType ?? "entity"} discussion
                                  </p>
                                ) : null}
                              </div>
                              {item.userId === currentUserId ? (
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label="Delete reply"
                                  disabled={deleteReply.isPending}
                                  onClick={() => deleteReply.mutate(item.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              ) : null}
                            </div>
                          </li>
                        );
                      })}
                      <div ref={repliesEndRef} />
                    </ul>
                  ) : (
                    <p className="rounded-xl border border-dashed border-border/70 px-4 py-6 text-center text-xs text-muted-foreground">
                      No replies yet. Start the thread below — task replies also sync
                      into the task discussion.
                    </p>
                  )}

                  <div className="space-y-2 rounded-2xl border border-border/80 bg-muted/15 p-3">
                    <label htmlFor="notification-quick-reply" className="sr-only">
                      Quick reply
                    </label>
                    <Textarea
                      id="notification-quick-reply"
                      ref={replyRef}
                      value={reply}
                      onChange={(event) => setReply(event.target.value)}
                      placeholder="Write a reply…"
                      className="min-h-22 resize-none border-border/50 bg-background"
                      disabled={createReply.isPending}
                      onKeyDown={(event) => {
                        if (
                          (event.metaKey || event.ctrlKey) &&
                          event.key === "Enter"
                        ) {
                          event.preventDefault();
                          handleReplySubmit();
                        }
                      }}
                    />
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] text-muted-foreground">
                        ⌘/Ctrl + Enter to send
                      </p>
                      <Button
                        size="sm"
                        disabled={!reply.trim() || createReply.isPending}
                        onClick={handleReplySubmit}
                      >
                        <Send className="h-3.5 w-3.5" />
                        {createReply.isPending ? "Sending…" : "Reply"}
                      </Button>
                    </div>
                    {replyHint ? (
                      <p
                        className="text-xs text-muted-foreground"
                        role="status"
                        aria-live="polite"
                      >
                        {replyHint}
                      </p>
                    ) : null}
                  </div>
                </section>
              </div>
            </div>

            {/* Sticky action bar */}
            <footer
              className="shrink-0 border-t border-border/80 bg-background/95 px-3 py-3 backdrop-blur supports-backdrop-filter:bg-background/80 sm:px-4"
              aria-label="Notification actions"
            >
              <div className="flex flex-wrap items-center gap-2">
                {related.href ? (
                  <Button asChild size="sm" className="flex-1 sm:flex-none">
                    <Link href={related.href}>
                      <ExternalLink className="h-4 w-4" />
                      Open Related Item
                    </Link>
                  </Button>
                ) : (
                  <Button size="sm" className="flex-1 sm:flex-none" disabled>
                    <ExternalLink className="h-4 w-4" />
                    Open Related Item
                  </Button>
                )}

                {!notification.isRead ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isMarkingRead}
                    onClick={() => onMarkRead(notification.id)}
                    aria-label="Mark as read"
                  >
                    <CheckCheck className="h-4 w-4" />
                    <span className="hidden sm:inline">Mark as Read</span>
                  </Button>
                ) : null}

                <Button
                  size="sm"
                  variant="outline"
                  disabled={isArchiving || notification.isArchived}
                  onClick={() => {
                    onArchive(notification.id);
                    closePanel();
                  }}
                  aria-label="Archive notification"
                >
                  <Archive className="h-4 w-4" />
                  <span className="hidden sm:inline">Archive</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={isDeleting}
                  onClick={() => {
                    onDelete(notification.id);
                    closePanel();
                  }}
                  aria-label="Delete notification"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Delete</span>
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={focusReply}
                  aria-label="Reply to notification"
                >
                  <Reply className="h-4 w-4" />
                  <span className="hidden sm:inline">Reply</span>
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void handleCopyLink()}
                  aria-label="Copy notification link"
                >
                  <Copy className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {copyState === "copied" ? "Copied" : "Copy Link"}
                  </span>
                </Button>
              </div>
            </footer>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
