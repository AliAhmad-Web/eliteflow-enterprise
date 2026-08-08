"use client";

import { PERMISSIONS } from "@enterprise/shared";
import type { IntegrationLogDto } from "@enterprise/shared";
import {
  Activity,
  RefreshCw,
  Webhook,
} from "lucide-react";
import { useState } from "react";

import { EmptyState } from "@/components/common/feedback/empty-state";
import { ErrorState } from "@/components/common/feedback/error-state";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useHasPermission,
  useRole,
} from "@/features/rbac/hooks/use-permissions";
import { ApiClientError, getApiErrorMessage } from "@/services/api/api-error";
import { cn } from "@/lib/utils";

import {
  useIntegrationLogs,
  useSyncQueueOverview,
  useWebhookMonitorOverview,
} from "../hooks/use-integrations";
import {
  useCancelSync,
  useRetrySync,
} from "../hooks/use-monitoring-mutations";
import { formatIntegrationWhen } from "../lib/integration-ui";
import { IntegrationMetric } from "./integration-metric";
import { SyncJobsList } from "./integration-monitoring-tabs";

type OpsTab = "queue" | "webhooks";

function accessErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError) {
    if (error.status === 401) return "Sign in required.";
    if (error.status === 403) {
      return "You do not have permission to view this data.";
    }
  }
  return getApiErrorMessage(error, fallback);
}

export function IntegrationsOpsPanel({
  canManage: canManageProp,
}: {
  canManage?: boolean;
}) {
  const { isAdmin } = useRole();
  const canManagePermission = useHasPermission(PERMISSIONS.INTEGRATIONS_MANAGE);
  const canManage = canManageProp ?? (isAdmin || canManagePermission);

  const [tab, setTab] = useState<OpsTab>("queue");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const queueQuery = useSyncQueueOverview(null, {
    enabled: tab === "queue",
    poll: true,
  });
  const webhooksQuery = useWebhookMonitorOverview(null, {
    enabled: tab === "webhooks",
    poll: true,
  });
  const webhookLogsQuery = useIntegrationLogs(
    {
      page: 1,
      pageSize: 20,
      search: "webhook",
    },
    { enabled: tab === "webhooks" },
  );

  const retrySync = useRetrySync();
  const cancelSync = useCancelSync();
  const busy = retrySync.isPending || cancelSync.isPending;

  function runJobAction(
    label: string,
    action: () => Promise<unknown>,
  ) {
    setActionError(null);
    setActionMessage(null);
    void action()
      .then(() => {
        setActionMessage(`${label} completed.`);
        void queueQuery.refetch();
      })
      .catch((error) => {
        setActionError(accessErrorMessage(error, `${label} failed.`));
      });
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-base">Sync queue & webhook monitor</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Cross-integration job queue and webhook delivery status from live
            Integration Center APIs.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={tab === "queue" ? "default" : "outline"}
            onClick={() => setTab("queue")}
          >
            <Activity className="mr-2 h-4 w-4" aria-hidden="true" />
            Sync queue
          </Button>
          <Button
            type="button"
            size="sm"
            variant={tab === "webhooks" ? "default" : "outline"}
            onClick={() => setTab("webhooks")}
          >
            <Webhook className="mr-2 h-4 w-4" aria-hidden="true" />
            Webhooks
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              if (tab === "queue") void queueQuery.refetch();
              else {
                void webhooksQuery.refetch();
                void webhookLogsQuery.refetch();
              }
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {actionMessage ? (
          <p className="text-sm text-emerald-700 dark:text-emerald-300" role="status">
            {actionMessage}
          </p>
        ) : null}
        {actionError ? (
          <p className="text-sm text-destructive" role="alert">
            {actionError}
          </p>
        ) : null}

        {tab === "queue" ? (
          <QueueSection
            isLoading={queueQuery.isLoading}
            isError={queueQuery.isError}
            error={queueQuery.error}
            onRetry={() => void queueQuery.refetch()}
            data={queueQuery.data}
            canManage={canManage}
            busy={busy}
            onRetryJob={(jobId) =>
              runJobAction("Retry", () => retrySync.mutateAsync(jobId))
            }
            onCancelJob={(jobId) =>
              runJobAction("Cancel", () => cancelSync.mutateAsync(jobId))
            }
          />
        ) : (
          <WebhooksSection
            isLoading={webhooksQuery.isLoading}
            isError={webhooksQuery.isError}
            error={webhooksQuery.error}
            onRetry={() => void webhooksQuery.refetch()}
            data={webhooksQuery.data}
            logsLoading={webhookLogsQuery.isLoading}
            logsError={webhookLogsQuery.isError}
            logs={webhookLogsQuery.data?.items ?? []}
            onRetryLogs={() => void webhookLogsQuery.refetch()}
          />
        )}
      </CardContent>
    </Card>
  );
}

function QueueSection({
  isLoading,
  isError,
  error,
  onRetry,
  data,
  canManage,
  busy,
  onRetryJob,
  onCancelJob,
}: {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  data: ReturnType<typeof useSyncQueueOverview>["data"];
  canManage: boolean;
  busy: boolean;
  onRetryJob: (jobId: string) => void;
  onCancelJob: (jobId: string) => void;
}) {
  if (isLoading) return <LoadingState label="Loading sync queue" />;
  if (isError) {
    return (
      <ErrorState
        title="Unable to load sync queue"
        description={accessErrorMessage(error, "Please try again.")}
        onRetry={onRetry}
        className="min-h-32 py-8"
      />
    );
  }
  if (!data) {
    return (
      <EmptyState
        icon={Activity}
        title="No queue data"
        description="Sync queue metrics will appear once integrations run jobs."
        className="min-h-32"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 text-sm">
        <IntegrationMetric label="Queue length" value={String(data.queueLength)} />
        <IntegrationMetric label="Pending" value={String(data.pendingJobs)} />
        <IntegrationMetric label="Running / processing" value={String(data.runningJobs)} />
        <IntegrationMetric label="Failed" value={String(data.failedJobs)} />
        <IntegrationMetric label="Completed / delivered" value={String(data.completedJobs)} />
        <IntegrationMetric label="Cancelled" value={String(data.cancelledJobs)} />
      </div>
      <SyncJobsList
        jobs={data.jobs}
        title="Queue jobs"
        emptyLabel="No sync jobs in the queue."
        canManage={canManage}
        busy={busy}
        onRetry={onRetryJob}
        onCancel={onCancelJob}
      />
    </div>
  );
}

function WebhooksSection({
  isLoading,
  isError,
  error,
  onRetry,
  data,
  logsLoading,
  logsError,
  logs,
  onRetryLogs,
}: {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  data: ReturnType<typeof useWebhookMonitorOverview>["data"];
  logsLoading: boolean;
  logsError: boolean;
  logs: IntegrationLogDto[];
  onRetryLogs: () => void;
}) {
  if (isLoading) return <LoadingState label="Loading webhook monitor" />;
  if (isError) {
    return (
      <ErrorState
        title="Unable to load webhook monitor"
        description={accessErrorMessage(error, "Please try again.")}
        onRetry={onRetry}
        className="min-h-32 py-8"
      />
    );
  }
  if (!data) {
    return (
      <EmptyState
        icon={Webhook}
        title="No webhook data"
        description="Webhook endpoints will appear when integrations register them."
        className="min-h-32"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 text-sm">
        <IntegrationMetric label="Total endpoints" value={String(data.totalWebhooks)} />
        <IntegrationMetric label="Active" value={String(data.active)} />
        <IntegrationMetric label="Disabled" value={String(data.disabled)} />
        <IntegrationMetric
          label="Failed deliveries"
          value={String(data.failedDeliveries)}
        />
        <IntegrationMetric
          label="Successful deliveries"
          value={String(data.successfulDeliveries)}
        />
        <IntegrationMetric label="Retries" value={String(data.retryCount)} />
        <IntegrationMetric
          label="Avg delivery time"
          value={
            data.averageDeliveryTimeMs == null
              ? "—"
              : `${data.averageDeliveryTimeMs} ms`
          }
        />
        <IntegrationMetric
          label="Last delivery"
          value={formatIntegrationWhen(data.lastDeliveryAt)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Webhook endpoints</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {data.endpoints.length === 0 ? (
            <EmptyState
              icon={Webhook}
              title="No webhook endpoints"
              description="Connected integrations can register inbound webhook URLs."
              className="min-h-24"
            />
          ) : (
            data.endpoints.map((hook) => (
              <div
                key={hook.id}
                className="flex flex-col gap-2 border-b border-border/40 pb-3 last:border-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{hook.url}</p>
                  <p className="text-muted-foreground">
                    Events: {hook.events.join(", ") || "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Last received {formatIntegrationWhen(hook.lastReceivedAt)} ·
                    Status {hook.lastDeliveryStatus ?? "—"} · Integration{" "}
                    {hook.integrationId.slice(0, 8)}…
                  </p>
                </div>
                <Badge variant={hook.isActive ? "success" : "secondary"}>
                  {hook.isActive ? "Active" : "Disabled"}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Recent webhook events</CardTitle>
          <Button type="button" size="sm" variant="outline" onClick={onRetryLogs}>
            Refresh events
          </Button>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {logsLoading ? (
            <p className="text-muted-foreground">Loading events…</p>
          ) : logsError ? (
            <ErrorState
              title="Unable to load webhook events"
              description="Delivery event history uses the integrations logs API."
              onRetry={onRetryLogs}
              className="min-h-24 py-6"
            />
          ) : logs.length === 0 ? (
            <p className="text-muted-foreground">
              No webhook delivery events logged yet.
            </p>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="border-b border-border/40 pb-3 last:border-0"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{log.action}</p>
                  <Badge
                    variant={
                      log.level === "ERROR"
                        ? "destructive"
                        : log.level === "WARNING"
                          ? "warning"
                          : "outline"
                    }
                  >
                    {log.level}
                  </Badge>
                  <span
                    className={cn(
                      "text-xs",
                      log.action.includes("failed") || log.level === "ERROR"
                        ? "text-destructive"
                        : "text-muted-foreground",
                    )}
                  >
                    {log.action.includes("failed") || log.level === "ERROR"
                      ? "Failed"
                      : log.action.includes("success")
                        ? "Delivered"
                        : "Event"}
                  </span>
                </div>
                <p className="text-muted-foreground">{log.message}</p>
                <p className="text-xs text-muted-foreground">
                  {formatIntegrationWhen(log.createdAt)}
                  {log.integrationId
                    ? ` · Integration ${log.integrationId.slice(0, 8)}…`
                    : ""}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
