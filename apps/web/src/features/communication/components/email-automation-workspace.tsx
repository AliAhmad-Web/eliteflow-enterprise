"use client";

import {
  UserRole,
  type NotificationQueueStatusValue,
} from "@enterprise/shared";
import { Mail, RefreshCw, Search, Send } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/constants/routes";
import { useAuthStore } from "@/features/auth/stores/auth.store";
import {
  isCommunicationEmailAutomationEnabled,
  isCommunicationEmailTemplatesEnabled,
  isCommunicationEmailWorkspaceEnabled,
  isCommunicationFeedbackEnabled,
  isCommunicationStatusEnabled,
  isEmailAiExecutiveAnyEnabled,
} from "../feature-flags";
import { deliveryStatusLabel } from "../utils/channel-orchestration";
import {
  formatProviderStatusBadge,
  getEmailAutomationProviderInfo,
} from "../utils/provider-status";
import { EmailWorkspacePageContent } from "./email-workspace";
import {
  useCreateNotification,
  useProcessNotificationQueue,
} from "@/features/notifications/hooks/use-notifications-mutations";
import {
  useNotificationHistory,
  useNotificationQueue,
  useNotificationTemplates,
} from "@/features/notifications/hooks/use-notifications";
import { formatRelativeTime } from "@/features/notifications/types/notifications.types";
import { cn } from "@/lib/utils";
import { ApiClientError } from "@/services/api/api-error";

const EMAIL_AUDIT_ACTIONS = new Set([
  "EMAIL_QUEUED",
  "EMAIL_SENT",
  "EMAIL_FAILED",
  "QUEUE_RETRY_PLANNED",
]);

const QUEUE_STATUS_FILTERS: Array<NotificationQueueStatusValue | "ALL"> = [
  "ALL",
  "PENDING",
  "PROCESSING",
  "SENT",
  "FAILED",
  "CANCELLED",
];

const selectClassName =
  "flex h-10 w-full rounded-lg border border-input bg-background/80 px-3 py-2 text-sm text-foreground shadow-[var(--shadow-xs)] transition-all focus-visible:outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring/50 sm:w-[180px]";

function isOrgAdminRole(roleCode: string | undefined): boolean {
  return roleCode === UserRole.ADMIN || roleCode === UserRole.SUPER_ADMIN;
}

/**
 * Shared Email Automation workspace (Communication feature).
 * Reuses existing notifications queue/templates/history/create APIs + emailService.
 */
export function EmailAutomationWorkspace(props?: { compact?: boolean }) {
  const compact = props?.compact ?? false;
  const automation = isCommunicationEmailAutomationEnabled();
  const templatesFlag = isCommunicationEmailTemplatesEnabled();
  const statusUx = isCommunicationStatusEnabled();
  const feedbackUx = isCommunicationFeedbackEnabled();

  if (!automation && !templatesFlag) {
    return (
      <div className="rounded-lg border border-border/60 px-3 py-4 text-sm text-muted-foreground">
        Email Automation is disabled. Enable{" "}
        <code className="text-xs">COMMUNICATION_EMAIL_*</code> feature flags.
      </div>
    );
  }

  return (
    <EmailAutomationWorkspaceInner
      automation={automation}
      templatesFlag={templatesFlag}
      statusUx={statusUx}
      feedbackUx={feedbackUx}
      compact={compact}
    />
  );
}

function EmailAutomationWorkspaceInner(props: {
  automation: boolean;
  templatesFlag: boolean;
  statusUx: boolean;
  feedbackUx: boolean;
  compact: boolean;
}) {
  const { automation, templatesFlag, statusUx, feedbackUx, compact } = props;
  const user = useAuthStore((state) => state.user);
  const isAdmin = isOrgAdminRole(user?.role?.code);
  const emailProvider = getEmailAutomationProviderInfo();
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    NotificationQueueStatusValue | "ALL"
  >("ALL");

  const queueQuery = useNotificationQueue(
    {
      page: 1,
      pageSize: compact ? 12 : 40,
      channel: "EMAIL",
      status: statusFilter === "ALL" ? undefined : statusFilter,
    },
    automation && isAdmin,
  );
  const failedQuery = useNotificationQueue(
    { page: 1, pageSize: 8, channel: "EMAIL", status: "FAILED" },
    automation && isAdmin,
  );
  const templatesQuery = useNotificationTemplates(templatesFlag && isAdmin);
  const historyQuery = useNotificationHistory(1, automation);

  const processQueue = useProcessNotificationQueue();
  const createNotification = useCreateNotification();

  const queueItems = useMemo(
    () => queueQuery.data?.items ?? [],
    [queueQuery.data?.items],
  );
  const failedItems = failedQuery.data?.items ?? [];
  const templates = templatesQuery.data?.items ?? [];

  const filteredQueueItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return queueItems;
    return queueItems.filter((item) => {
      const subject = (item.subject ?? "").toLowerCase();
      const to = (item.toAddress ?? "").toLowerCase();
      const err = (item.lastError ?? "").toLowerCase();
      return subject.includes(q) || to.includes(q) || err.includes(q);
    });
  }, [queueItems, search]);

  const deliverySummary = useMemo(() => {
    const counts = {
      PENDING: 0,
      PROCESSING: 0,
      SENT: 0,
      FAILED: 0,
      CANCELLED: 0,
    };
    for (const item of queueItems) {
      counts[item.status] = (counts[item.status] ?? 0) + 1;
    }
    return counts;
  }, [queueItems]);

  const statistics = useMemo(() => {
    const total = queueQuery.data?.total ?? queueItems.length;
    const failed = failedQuery.data?.total ?? failedItems.length;
    const sent = deliverySummary.SENT;
    const pending = deliverySummary.PENDING + deliverySummary.PROCESSING;
    const successRate =
      total > 0 ? Math.round((sent / Math.max(total, 1)) * 100) : 0;
    return {
      total,
      sent,
      failed,
      pending,
      successRate,
      templates: templates.length,
    };
  }, [
    queueQuery.data?.total,
    queueItems.length,
    failedQuery.data?.total,
    failedItems.length,
    deliverySummary.SENT,
    deliverySummary.PENDING,
    deliverySummary.PROCESSING,
    templates.length,
  ]);

  const recentEmailActivity = useMemo(() => {
    const items = historyQuery.data?.items ?? [];
    return items.filter((item) => {
      if (EMAIL_AUDIT_ACTIONS.has(item.action)) return true;
      const meta = item.metadata as { channel?: string } | null;
      return meta?.channel === "EMAIL";
    });
  }, [historyQuery.data?.items]);

  const clearFeedback = () => {
    setActionMessage(null);
    setActionError(null);
  };

  const handleTestEmail = async () => {
    clearFeedback();
    if (!user?.id) {
      setActionError("Sign in required to send a test email.");
      return;
    }
    try {
      const result = await createNotification.mutateAsync({
        userId: user.id,
        title: "EliteFlow test email",
        body: "This is a test notification email from Communication → Email Automation.",
        category: "SYSTEM",
        priority: "NORMAL",
        sendEmail: true,
        audienceType: "INDIVIDUAL",
        metadata: { source: "communication_email_automation_test" },
      });
      let processNote = "";
      try {
        const processed = await processQueue.mutateAsync();
        processNote = ` Delivered via queue (processed ${processed.processed}, sent ${processed.sent}, failed ${processed.failed}).`;
      } catch {
        processNote =
          " Queued — process the email queue to complete delivery.";
      }
      setActionMessage(
        `Test email created (in-app ${result.created}, queued ${result.queued}).${processNote}`,
      );
      void queueQuery.refetch();
      void historyQuery.refetch();
      void failedQuery.refetch();
    } catch (error) {
      setActionError(
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Test email failed",
      );
    }
  };

  const handleRetryFailed = async () => {
    clearFeedback();
    try {
      const result = await processQueue.mutateAsync();
      setActionMessage(
        `Queue processed — processed ${result.processed}, sent ${result.sent}, failed ${result.failed}. Failed emails were re-queued first.`,
      );
      void queueQuery.refetch();
      void failedQuery.refetch();
      void historyQuery.refetch();
    } catch (error) {
      setActionError(
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Retry failed",
      );
    }
  };

  const handleProcessQueue = async () => {
    clearFeedback();
    try {
      const result = await processQueue.mutateAsync();
      setActionMessage(
        `Queue updated — processed ${result.processed}, sent ${result.sent}, failed ${result.failed}.`,
      );
      void queueQuery.refetch();
      void failedQuery.refetch();
      void historyQuery.refetch();
    } catch (error) {
      setActionError(
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Process queue failed",
      );
    }
  };

  return (
    <section
      className={cn(
        "space-y-4",
        compact
          ? "rounded-lg border border-border/60 bg-card/50 px-3 py-3"
          : "space-y-5",
      )}
      aria-label="Email Automation"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Mail className="h-4 w-4 text-foreground" aria-hidden="true" />
            <h2
              className={cn(
                "font-semibold text-foreground",
                compact ? "text-sm" : "text-base",
              )}
            >
              Email Dashboard
            </h2>
            <Badge
              variant={emailProvider.status === "ready" ? "success" : "warning"}
            >
              {emailProvider.status === "ready"
                ? "Connected"
                : formatProviderStatusBadge(emailProvider.status)}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {emailProvider.message}
          </p>
        </div>
        {automation && isAdmin ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={createNotification.isPending}
              onClick={() => {
                void handleTestEmail();
              }}
            >
              <Send className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
              Test Email
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={processQueue.isPending}
              onClick={() => {
                void handleProcessQueue();
              }}
            >
              <RefreshCw
                className={cn(
                  "mr-2 h-3.5 w-3.5",
                  processQueue.isPending && "animate-spin",
                )}
                aria-hidden="true"
              />
              Process Queue
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={processQueue.isPending || failedItems.length === 0}
              onClick={() => {
                void handleRetryFailed();
              }}
            >
              Retry Failed Emails
              {failedItems.length > 0 ? ` (${failedItems.length})` : ""}
            </Button>
          </div>
        ) : null}
      </div>

      {feedbackUx && (actionMessage || actionError) ? (
        <p
          className={cn(
            "rounded-md border px-2 py-1.5 text-xs",
            actionError
              ? "border-destructive/40 bg-destructive/5 text-destructive"
              : "border-border/60 bg-background/70 text-muted-foreground",
          )}
          role="status"
        >
          {actionError ?? actionMessage}
        </p>
      ) : null}

      {!isAdmin ? (
        <p className="text-xs text-muted-foreground">
          Organization admins can manage templates, queue processing, retries,
          and test emails. Your recent email delivery activity still appears
          below.
        </p>
      ) : null}

      {automation ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Queue total" value={String(statistics.total)} />
          <StatCard
            label="Pending / processing"
            value={String(statistics.pending)}
          />
          <StatCard label="Sent (page)" value={String(statistics.sent)} />
          <StatCard
            label="Failed"
            value={String(statistics.failed)}
            tone={statistics.failed > 0 ? "warn" : "default"}
          />
          {!compact ? (
            <>
              <StatCard
                label="Success rate (page)"
                value={`${statistics.successRate}%`}
              />
              <StatCard
                label="Templates"
                value={String(statistics.templates)}
              />
              <StatCard
                label="Provider"
                value={
                  emailProvider.status === "ready"
                    ? "Connected"
                    : "Not Configured"
                }
              />
              <StatCard
                label="Activity window"
                value={String(recentEmailActivity.length)}
              />
            </>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-md border border-border/50 bg-background/60 px-2 py-2">
        <p className="text-[11px] font-medium text-foreground">
          Provider Status
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>emailService</span>
          <Badge
            variant={emailProvider.status === "ready" ? "success" : "warning"}
          >
            {emailProvider.status === "ready" ? "Connected" : "Not Configured"}
          </Badge>
        </div>
      </div>

      {(automation || statusUx) && isAdmin ? (
        <div className="rounded-md border border-border/50 bg-background/60 px-2 py-2">
          <p className="text-[11px] font-medium text-foreground">
            Delivery Status
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <Badge variant="outline">
              {deliveryStatusLabel("queued")}: {deliverySummary.PENDING}
            </Badge>
            <Badge variant="outline">
              Processing: {deliverySummary.PROCESSING}
            </Badge>
            <Badge variant="outline">
              {deliveryStatusLabel("sent")}: {deliverySummary.SENT}
            </Badge>
            <Badge variant="outline">
              {deliveryStatusLabel("failed")}: {deliverySummary.FAILED}
            </Badge>
            {statusUx ? (
              <Badge variant="outline">
                {deliveryStatusLabel("retry_prepared")}
              </Badge>
            ) : null}
          </div>
          {queueQuery.isError ? (
            <p className="mt-2 text-xs text-destructive">
              {queueQuery.error instanceof Error
                ? queueQuery.error.message
                : "Could not load delivery status"}
            </p>
          ) : null}
        </div>
      ) : null}

      {automation && isAdmin ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search subject, recipient, or error…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search email queue"
            />
          </div>
          <select
            className={selectClassName}
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as NotificationQueueStatusValue | "ALL",
              )
            }
            aria-label="Filter by delivery status"
          >
            {QUEUE_STATUS_FILTERS.map((option) => (
              <option key={option} value={option}>
                {option === "ALL" ? "All statuses" : option}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {templatesFlag ? (
        <div className="rounded-md border border-border/50 bg-background/60 px-2 py-2">
          <p className="text-[11px] font-medium text-foreground">
            Email Templates
          </p>
          {!isAdmin ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Admin access required to list notification email templates.
            </p>
          ) : templatesQuery.isLoading ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Loading templates…
            </p>
          ) : templatesQuery.isError ? (
            <p className="mt-1 text-xs text-destructive">
              {templatesQuery.error instanceof Error
                ? templatesQuery.error.message
                : "Could not load templates"}
            </p>
          ) : templates.length === 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">
              No notification templates found.
            </p>
          ) : (
            <ul className="mt-2 max-h-48 space-y-1.5 overflow-y-auto text-xs">
              {templates.map((template) => (
                <li
                  key={template.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded border border-border/40 px-2 py-1"
                >
                  <span className="font-medium text-foreground">
                    {template.name}
                  </span>
                  <span className="text-muted-foreground">
                    {template.code} · {template.category}
                    {template.emailTemplate ? " · email HTML" : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {automation && isAdmin ? (
        <div className="rounded-md border border-border/50 bg-background/60 px-2 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-medium text-foreground">
              Email Queue
            </p>
            <span className="text-[11px] text-muted-foreground">
              Showing {filteredQueueItems.length} of{" "}
              {queueQuery.data?.total ?? 0} · auto-refresh
            </span>
          </div>
          {queueQuery.isLoading ? (
            <p className="mt-1 text-xs text-muted-foreground">Loading queue…</p>
          ) : filteredQueueItems.length === 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">
              No EMAIL queue items match the current filters.
            </p>
          ) : (
            <ul
              className={cn(
                "mt-2 space-y-1.5 overflow-y-auto text-xs",
                compact ? "max-h-48" : "max-h-80",
              )}
            >
              {filteredQueueItems.map((item) => (
                <li
                  key={item.id}
                  className="rounded border border-border/40 px-2 py-1.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-foreground">
                      {item.subject ?? "(no subject)"}
                    </span>
                    <Badge variant="outline">{item.status}</Badge>
                  </div>
                  <div className="mt-0.5 text-muted-foreground">
                    {item.toAddress ?? "—"} · attempts {item.attempts} ·{" "}
                    {formatRelativeTime(item.updatedAt)}
                  </div>
                  {item.lastError ? (
                    <p className="mt-0.5 text-destructive">{item.lastError}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {automation ? (
        <div className="rounded-md border border-border/50 bg-background/60 px-2 py-2">
          <p className="text-[11px] font-medium text-foreground">
            Recent Email Activity
          </p>
          {historyQuery.isLoading ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Loading activity…
            </p>
          ) : recentEmailActivity.length === 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">
              No recent email delivery audits.
            </p>
          ) : (
            <ul className="mt-2 max-h-48 space-y-1.5 overflow-y-auto text-xs">
              {recentEmailActivity.slice(0, compact ? 12 : 24).map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded border border-border/40 px-2 py-1"
                >
                  <span className="font-medium text-foreground">
                    {item.action}
                  </span>
                  <span className="text-muted-foreground">
                    {formatRelativeTime(item.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {!compact ? (
        <p className="text-xs text-muted-foreground">
          In-app email notification events remain in{" "}
          <Link
            href={ROUTES.NOTIFICATIONS}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Notification Center
          </Link>
          .
        </p>
      ) : null}
    </section>
  );
}

function StatCard(props: {
  label: string;
  value: string;
  tone?: "default" | "warn";
}) {
  return (
    <div
      className={cn(
        "rounded-md border border-border/50 bg-background/60 px-3 py-2",
        props.tone === "warn" && "border-warning/40",
      )}
    >
      <p className="text-[11px] text-muted-foreground">{props.label}</p>
      <p className="mt-0.5 text-sm font-semibold text-foreground">
        {props.value}
      </p>
    </div>
  );
}

/** Full Communication → Email Automation page shell. */
export function EmailAutomationPageContent() {
  const workspace =
    isCommunicationEmailWorkspaceEnabled() || isEmailAiExecutiveAnyEnabled();
  const emailUx =
    isCommunicationEmailAutomationEnabled() ||
    isCommunicationEmailTemplatesEnabled();

  // Prefer enterprise AI workspace whenever available
  if (workspace) {
    return <EmailWorkspacePageContent />;
  }

  if (!emailUx) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Email Automation"
          description="Notification email delivery via emailService."
        />
        <p className="text-sm text-muted-foreground">
          Enable COMMUNICATION_EMAIL_AUTOMATION, COMMUNICATION_EMAIL_TEMPLATES,
          COMMUNICATION_EMAIL_WORKSPACE, or any EMAIL_AI_* flag to use this page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Email Automation"
        description="Templates, queue, delivery status, and emailService-backed sends — Communication channel."
      />
      <EmailAutomationWorkspace />
    </div>
  );
}

/** Notification Center entry — link only, no duplicated ops UI. */
export function EmailAutomationNotificationsLink() {
  const emailUx =
    isCommunicationEmailAutomationEnabled() ||
    isCommunicationEmailTemplatesEnabled() ||
    isCommunicationEmailWorkspaceEnabled();
  if (!emailUx) return null;

  const provider = getEmailAutomationProviderInfo();

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/50 px-3 py-3 text-xs"
      role="status"
    >
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-foreground">
            Email notifications
          </span>
          <Badge
            variant={provider.status === "ready" ? "success" : "warning"}
          >
            {provider.status === "ready"
              ? "Connected"
              : formatProviderStatusBadge(provider.status)}
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Manage the Email workspace, templates, queue, and sends in Communication.
        </p>
      </div>
      <Button asChild size="sm" variant="outline">
        <Link href={ROUTES.EMAIL_AUTOMATION}>Open Email</Link>
      </Button>
    </div>
  );
}
