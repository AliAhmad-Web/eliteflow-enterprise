"use client";

import {
  NOTIFICATION_CATEGORIES,
  PERMISSIONS,
  type Notification,
  type NotificationCategoryValue,
  type NotificationPriorityValue,
} from "@enterprise/shared";
import {
  Archive,
  Bell,
  CheckCheck,
  Search,
  Settings2,
  Trash2,
} from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";

import { EmptyState } from "@/components/common/feedback/empty-state";
import { ErrorState } from "@/components/common/feedback/error-state";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  deliveryStatusLabel,
  EmailAutomationNotificationsLink,
  formatProviderStatusBadge,
  getWhatsappProviderInfo,
  isCommunicationEmailPresentationEnabled,
  isCommunicationFeedbackEnabled,
  isCommunicationOrchestrationEnabled,
  isCommunicationStatusEnabled,
  isCommunicationWhatsappPresentationEnabled,
} from "@/features/communication";
import { useHasPermission } from "@/features/rbac/hooks/use-permissions";
import { ApiClientError } from "@/services/api/api-error";
import { cn } from "@/lib/utils";

import {
  useBulkArchiveNotifications,
  useBulkDeleteNotifications,
  useBulkReadNotifications,
  useDeleteNotification,
  useArchiveNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useUpdateNotificationPreferences,
} from "../hooks/use-notifications-mutations";
import {
  useNotificationPreferences,
  useNotifications,
} from "../hooks/use-notifications";
import {
  CATEGORY_LABELS,
  formatRelativeTime,
  type NotificationTab,
} from "../types/notifications.types";
import { NotificationDetailPanel } from "./notification-detail-panel";

const selectClassName =
  "flex h-10 w-full rounded-lg border border-input bg-background/80 px-3 py-2 text-sm text-foreground shadow-[var(--shadow-xs)] transition-all focus-visible:outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring/50 sm:w-[160px]";

const PRIORITY_OPTIONS: Array<NotificationPriorityValue | "ALL"> = [
  "ALL",
  "URGENT",
  "HIGH",
  "NORMAL",
  "LOW",
];

const CATEGORY_TABS: Array<{ id: NotificationTab; label: string }> = [
  { id: "all", label: "All" },
  ...NOTIFICATION_CATEGORIES.map((c) => ({
    id: c as NotificationTab,
    label: CATEGORY_LABELS[c],
  })),
  { id: "archived", label: "Archived" },
];

export function NotificationsPageContent() {
  const canRead = useHasPermission(PERMISSIONS.NOTIFICATIONS_READ);
  const statusUx = isCommunicationStatusEnabled();
  const feedbackUx = isCommunicationFeedbackEnabled();
  const whatsappUx = isCommunicationWhatsappPresentationEnabled();
  const orchestrationUx = isCommunicationOrchestrationEnabled();
  const emailUx = isCommunicationEmailPresentationEnabled();
  const whatsappProvider = getWhatsappProviderInfo();
  const showChannelsPanel = statusUx || whatsappUx || orchestrationUx;
  const [tab, setTab] = useState<NotificationTab>("all");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [priority, setPriority] = useState<NotificationPriorityValue | "ALL">(
    "ALL",
  );
  const [readFilter, setReadFilter] = useState<"all" | "unread" | "read">("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [detail, setDetail] = useState<Notification | null>(null);
  const [showPrefs, setShowPrefs] = useState(false);

  const query = useMemo(
    () => ({
      page,
      pageSize: 20,
      search: deferredSearch || undefined,
      category:
        tab !== "all" && tab !== "archived"
          ? (tab as NotificationCategoryValue)
          : undefined,
      priority: priority === "ALL" ? undefined : priority,
      isArchived: (tab === "archived" ? "true" : "false") as "true" | "false",
      isRead:
        readFilter === "all"
          ? undefined
          : ((readFilter === "read" ? "true" : "false") as "true" | "false"),
    }),
    [page, deferredSearch, tab, priority, readFilter],
  );

  const listQuery = useNotifications(query, canRead);
  const prefsQuery = useNotificationPreferences(canRead && showPrefs);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const archiveOne = useArchiveNotification();
  const deleteOne = useDeleteNotification();
  const bulkRead = useBulkReadNotifications();
  const bulkArchive = useBulkArchiveNotifications();
  const bulkDelete = useBulkDeleteNotifications();
  const updatePrefs = useUpdateNotificationPreferences();

  const items = listQuery.data?.items ?? [];
  const total = listQuery.data?.total ?? 0;
  const unreadCount = listQuery.data?.unreadCount ?? 0;
  const pageSize = listQuery.data?.pageSize ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (!canRead) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Notifications"
          description="Stay on top of work across EliteFlow."
        />
        <ErrorState
          title="Permission denied"
          description="You do not have access to the notification center."
        />
      </div>
    );
  }

  const toggleSelected = (id: string) => {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  };

  const toggleAll = () => {
    if (selected.length === items.length) {
      setSelected([]);
      return;
    }
    setSelected(items.map((item) => item.id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Notification Center"
          description="In-app alerts across tasks, projects, billing, calendar, files, team, and AI."
        />
        <div className="flex flex-wrap items-center gap-2 sm:pt-1">
          <Button variant="outline" size="sm" onClick={() => setShowPrefs(true)}>
            <Settings2 className="mr-2 h-4 w-4" />
            Preferences
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={unreadCount === 0 || markAll.isPending}
            onClick={() => markAll.mutate()}
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            Mark all read
          </Button>
        </div>
      </div>

      {showChannelsPanel ? (
        <div
          className="space-y-2 rounded-lg border border-border/60 bg-card/50 px-3 py-3 text-xs text-muted-foreground"
          role="status"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium text-foreground">
              Delivery channels
            </span>
            {statusUx ? (
              <>
                <Badge variant="outline">{deliveryStatusLabel("queued")}</Badge>
                <Badge variant="outline">{deliveryStatusLabel("sent")}</Badge>
                <Badge variant="outline">{deliveryStatusLabel("failed")}</Badge>
                <Badge variant="outline">
                  {deliveryStatusLabel("provider_deferred")}
                </Badge>
                <Badge variant="outline">
                  {deliveryStatusLabel("awaiting_approval")}
                </Badge>
                <Badge variant="outline">
                  {deliveryStatusLabel("retry_prepared")}
                </Badge>
              </>
            ) : null}
          </div>
          {whatsappUx ? (
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/50 bg-background/60 px-2 py-1.5">
              <span className="font-medium text-foreground">WhatsApp</span>
              <Badge
                variant={
                  whatsappProvider.status === "ready" ? "success" : "warning"
                }
              >
                {formatProviderStatusBadge(whatsappProvider.status)}
              </Badge>
              <span>{whatsappProvider.message}</span>
            </div>
          ) : null}
          {orchestrationUx ? (
            <span>
              Orchestration: NotificationDispatcher + Action Framework
            </span>
          ) : null}
        </div>
      ) : null}

      {emailUx ? <EmailAutomationNotificationsLink /> : null}

      <div className="flex flex-wrap items-center gap-2">
        {CATEGORY_TABS.map((item) => (
          <Button
            key={item.id}
            size="sm"
            variant={tab === item.id ? "default" : "outline"}
            onClick={() => {
              setTab(item.id);
              setPage(1);
              setSelected([]);
            }}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search notifications…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <select
          className={selectClassName}
          value={priority}
          onChange={(event) => {
            setPriority(event.target.value as NotificationPriorityValue | "ALL");
            setPage(1);
          }}
          aria-label="Filter by priority"
        >
          {PRIORITY_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option === "ALL" ? "All priorities" : option}
            </option>
          ))}
        </select>
        <select
          className={selectClassName}
          value={readFilter}
          onChange={(event) => {
            setReadFilter(event.target.value as "all" | "unread" | "read");
            setPage(1);
          }}
          aria-label="Filter by read status"
        >
          <option value="all">All</option>
          <option value="unread">Unread</option>
          <option value="read">Read</option>
        </select>
      </div>

      {selected.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
          <span className="text-sm text-muted-foreground">
            {selected.length} selected
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              bulkRead.mutate(selected, { onSuccess: () => setSelected([]) })
            }
          >
            Mark read
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              bulkArchive.mutate(selected, { onSuccess: () => setSelected([]) })
            }
          >
            <Archive className="mr-1 h-4 w-4" />
            Archive
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() =>
              bulkDelete.mutate(selected, { onSuccess: () => setSelected([]) })
            }
          >
            <Trash2 className="mr-1 h-4 w-4" />
            Delete
          </Button>
        </div>
      ) : null}

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
          description="Nothing matches your current filters."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="flex items-center gap-3 border-b border-border/60 px-4 py-2">
            <input
              type="checkbox"
              checked={selected.length === items.length && items.length > 0}
              onChange={toggleAll}
              aria-label="Select all"
            />
            <span className="text-xs text-muted-foreground">
              {total} total · {unreadCount} unread
            </span>
          </div>
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li
                key={item.id}
                className={cn(
                  "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent/40",
                  !item.isRead && "bg-primary/5",
                )}
              >
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={selected.includes(item.id)}
                  onChange={() => toggleSelected(item.id)}
                  aria-label={`Select ${item.title}`}
                />
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => {
                    setDetail(item);
                    if (!item.isRead) markRead.mutate(item.id);
                  }}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p
                      className={cn(
                        "text-sm",
                        item.isRead ? "font-normal" : "font-semibold",
                      )}
                    >
                      {item.title}
                    </p>
                    <Badge variant="secondary" className="text-[10px]">
                      {CATEGORY_LABELS[item.category]}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {item.priority}
                    </Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {item.body}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground/80">
                    {formatRelativeTime(item.createdAt)}
                  </p>
                </button>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Archive"
                    onClick={() => archiveOne.mutate(item.id)}
                  >
                    <Archive className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Delete"
                    onClick={() => deleteOne.mutate(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <NotificationDetailPanel
        notification={detail}
        open={!!detail}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
        onMarkRead={(id) => markRead.mutate(id)}
        onArchive={(id) => archiveOne.mutate(id)}
        onDelete={(id) => deleteOne.mutate(id)}
        isMarkingRead={markRead.isPending}
        isArchiving={archiveOne.isPending}
        isDeleting={deleteOne.isPending}
      />

      <Sheet open={showPrefs} onOpenChange={setShowPrefs}>
        <SheetContent side="right" className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Notification preferences</SheetTitle>
            <p className="text-sm text-muted-foreground">
              Choose in-app and email delivery per category. Push, SMS, and
              Email delivery uses the existing emailService and notification queue.
              {whatsappUx
                ? ` WhatsApp: ${formatProviderStatusBadge(whatsappProvider.status)} — queue-ready without Meta credentials.`
                : ""}
              {emailUx
                ? " Open Email Automation under Communication for templates and queue ops."
                : ""}
              {statusUx
                ? " Delivery statuses: queued, sent, failed, provider deferred, awaiting approval."
                : ""}
            </p>
          </SheetHeader>
          <div className="mt-6 space-y-3">
            {prefsQuery.isLoading ? (
              <LoadingState />
            ) : prefsQuery.isError ? (
              <ErrorState
                title="Could not load preferences"
                description="Try again shortly."
                onRetry={() => void prefsQuery.refetch()}
              />
            ) : (
              (prefsQuery.data?.items ?? []).map((pref) => (
                <div
                  key={pref.id}
                  className="rounded-lg border border-border px-3 py-3"
                >
                  <p className="mb-2 text-sm font-medium">
                    {CATEGORY_LABELS[pref.category]}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                    {(
                      [
                        ["inAppEnabled", "In-app", pref.inAppEnabled],
                        ["emailEnabled", "Email", pref.emailEnabled],
                        ["pushEnabled", "Push", pref.pushEnabled],
                        ["smsEnabled", "SMS", pref.smsEnabled],
                        ...(whatsappUx
                          ? ([
                              [
                                "whatsappEnabled",
                                `WhatsApp (${formatProviderStatusBadge(whatsappProvider.status)})`,
                                pref.whatsappEnabled,
                              ],
                            ] as const)
                          : []),
                      ] as const
                    ).map(([key, label, value]) => (
                      <label
                        key={key}
                        className="flex items-center gap-2 rounded-md border border-border/50 px-2 py-1.5"
                      >
                        <input
                          type="checkbox"
                          checked={value}
                          disabled={updatePrefs.isPending}
                          onChange={(event) => {
                            updatePrefs.mutate({
                              preferences: [
                                {
                                  category: pref.category,
                                  [key]: event.target.checked,
                                },
                              ],
                            });
                          }}
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))
            )}
            {feedbackUx && updatePrefs.isPending ? (
              <p className="text-xs text-muted-foreground" role="status">
                Saving preference…
              </p>
            ) : null}
            {feedbackUx && updatePrefs.isError ? (
              <p className="text-xs text-destructive" role="alert">
                Could not save preference
              </p>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
