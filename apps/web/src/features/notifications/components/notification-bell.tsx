"use client";

import { PERMISSIONS, type Notification } from "@enterprise/shared";
import { Bell, CheckCheck, ExternalLink, Settings2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/common/feedback/empty-state";
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
import { ROUTES } from "@/constants/routes";
import { useHasPermission } from "@/features/rbac/hooks/use-permissions";
import { ApiClientError } from "@/services/api/api-error";
import { cn } from "@/lib/utils";

import {
  useArchiveNotification,
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from "../hooks/use-notifications-mutations";
import {
  useNotifications,
  useUnreadNotificationCount,
} from "../hooks/use-notifications";
import {
  CATEGORY_LABELS,
  formatRelativeTime,
} from "../types/notifications.types";
import { NotificationDetailPanel } from "./notification-detail-panel";

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
  const canRead = useHasPermission(PERMISSIONS.NOTIFICATIONS_READ);
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<Notification | null>(null);
  const unreadQuery = useUnreadNotificationCount(canRead);
  const listQuery = useNotifications(
    { page: 1, pageSize: 8, isArchived: "false" },
    canRead && open,
  );
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const archiveOne = useArchiveNotification();
  const deleteOne = useDeleteNotification();

  const unreadCount = unreadQuery.data?.count ?? 0;
  const items = listQuery.data?.items ?? [];

  const badgeLabel = useMemo(() => {
    if (unreadCount > 99) return "99+";
    return String(unreadCount);
  }, [unreadCount]);

  if (!canRead) {
    return null;
  }

  const openDetail = (item: Notification) => {
    setDetail(item);
    setOpen(false);
    if (!item.isRead) markRead.mutate(item.id);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className={cn("relative", className)}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        onClick={() => setOpen(true)}
      >
        <Bell strokeWidth={1.75} />
        {unreadCount > 0 ? (
          <Badge
            variant="destructive"
            className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full p-0 text-[9px] leading-none"
          >
            {badgeLabel}
          </Badge>
        ) : null}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
        >
          <SheetHeader className="border-b border-border/50 px-5 py-4 text-left">
            <div className="flex items-center justify-between gap-2">
              <div>
                <SheetTitle>Notifications</SheetTitle>
                <p className="text-sm text-muted-foreground">
                  {unreadCount > 0
                    ? `${unreadCount} unread`
                    : "You're all caught up"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                  aria-label="Notification preferences"
                >
                  <Link href={`${ROUTES.NOTIFICATIONS}?tab=preferences`}>
                    <Settings2 className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={unreadCount === 0 || markAll.isPending}
                  onClick={() => markAll.mutate()}
                >
                  <CheckCheck className="mr-1 h-4 w-4" />
                  Read all
                </Button>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto">
            {listQuery.isLoading ? (
              <LoadingState />
            ) : listQuery.isError ? (
              <ErrorState
                title="Could not load notifications"
                description={
                  listQuery.error instanceof ApiClientError
                    ? listQuery.error.message
                    : "Please try again."
                }
                onRetry={() => void listQuery.refetch()}
              />
            ) : items.length === 0 ? (
              <EmptyState
                icon={Bell}
                title="No notifications"
                description="Updates from tasks, projects, and billing will show up here."
              />
            ) : (
              <ul className="divide-y divide-border">
                {items.map((item) => (
                  <NotificationDrawerItem
                    key={item.id}
                    item={item}
                    onOpen={() => openDetail(item)}
                  />
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-border p-3">
            <Button variant="outline" className="w-full" asChild>
              <Link href={ROUTES.NOTIFICATIONS} onClick={() => setOpen(false)}>
                Open notification center
              </Link>
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <NotificationDetailPanel
        notification={detail}
        open={!!detail}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setDetail(null);
        }}
        onMarkRead={(id) => markRead.mutate(id)}
        onArchive={(id) => {
          archiveOne.mutate(id);
          setDetail(null);
        }}
        onDelete={(id) => {
          deleteOne.mutate(id);
          setDetail(null);
        }}
        isMarkingRead={markRead.isPending}
        isArchiving={archiveOne.isPending}
        isDeleting={deleteOne.isPending}
      />
    </>
  );
}

function NotificationDrawerItem({
  item,
  onOpen,
}: {
  item: Notification;
  onOpen: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        className="w-full px-5 py-3 text-left transition-colors hover:bg-accent"
        onClick={onOpen}
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-start justify-between gap-2">
            <p
              className={cn(
                "text-sm",
                item.isRead
                  ? "font-normal text-muted-foreground"
                  : "font-medium text-foreground",
              )}
            >
              {item.title}
            </p>
            {!item.isRead ? (
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
            ) : null}
          </div>
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {item.body}
          </p>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground/80">
            <span>{CATEGORY_LABELS[item.category]}</span>
            <span>·</span>
            <span>{formatRelativeTime(item.createdAt)}</span>
            {item.linkUrl ? <ExternalLink className="h-3 w-3" /> : null}
          </div>
        </div>
      </button>
    </li>
  );
}
