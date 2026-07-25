"use client";

import dynamic from "next/dynamic";
import type { IntegrationPlatformDetailDto } from "@enterprise/shared";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/common/feedback/loading-state";

import { formatConnectionDuration, formatIntegrationWhen } from "../lib/integration-ui";
import { IntegrationMetric } from "./integration-metric";

const LineChart = dynamic(
  () =>
    import("@/features/reports/components/simple-charts").then(
      (mod) => mod.LineChart,
    ),
  { ssr: false, loading: () => <LoadingState label="Loading chart" /> },
);

const AreaChart = dynamic(
  () =>
    import("@/features/reports/components/simple-charts").then(
      (mod) => mod.AreaChart,
    ),
  { ssr: false, loading: () => <LoadingState label="Loading chart" /> },
);

const BarChart = dynamic(
  () =>
    import("@/features/reports/components/simple-charts").then(
      (mod) => mod.BarChart,
    ),
  { ssr: false, loading: () => <LoadingState label="Loading chart" /> },
);

export function MonitoringTab({
  data,
}: {
  data: IntegrationPlatformDetailDto["monitoring"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Live Monitoring</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
        <IntegrationMetric label="Current Status" value={data.currentStatus} />
        <IntegrationMetric label="Health Status" value={data.healthStatus} />
        <IntegrationMetric label="Uptime" value={`${data.uptimePercentage}%`} />
        <IntegrationMetric
          label="Response Time"
          value={
            data.responseTimeMs == null ? "—" : `${data.responseTimeMs} ms`
          }
        />
        <IntegrationMetric
          label="Last Successful Sync"
          value={formatIntegrationWhen(data.lastSuccessfulSyncAt)}
        />
        <IntegrationMetric
          label="Last Failed Sync"
          value={formatIntegrationWhen(data.lastFailedSyncAt)}
        />
        <IntegrationMetric
          label="Success Rate"
          value={data.successRate == null ? "—" : `${data.successRate}%`}
        />
        <IntegrationMetric
          label="Failure Rate"
          value={data.failureRate == null ? "—" : `${data.failureRate}%`}
        />
        <IntegrationMetric
          label="Active Connection"
          value={data.activeConnection ? "Yes" : "No"}
        />
        <IntegrationMetric
          label="Connection Duration"
          value={formatConnectionDuration(data.connectionDurationMs)}
        />
      </CardContent>
    </Card>
  );
}

type SyncJob = IntegrationPlatformDetailDto["queue"]["jobs"][number];

/** Shared sync job list — used by Queue and Sync History tabs. */
export function SyncJobsList({
  jobs,
  title = "Sync Jobs",
  emptyLabel = "No sync jobs yet.",
  canManage = false,
  busy = false,
  onRetry,
  onCancel,
}: {
  jobs: SyncJob[];
  title?: string;
  emptyLabel?: string;
  canManage?: boolean;
  busy?: boolean;
  onRetry?: (jobId: string) => void;
  onCancel?: (jobId: string) => void;
}) {
  const showActions = canManage && onRetry && onCancel;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {jobs.length === 0 ? (
          <p className="text-muted-foreground">{emptyLabel}</p>
        ) : (
          jobs.map((job) => (
            <div
              key={job.id}
              className="flex flex-col gap-2 border-b border-border/40 pb-3 last:border-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{job.direction}</p>
                  <Badge variant="outline">{job.displayStatus}</Badge>
                </div>
                <p className="text-muted-foreground">
                  {job.message ?? "Sync job"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Started {formatIntegrationWhen(job.startedAt)} · Finished{" "}
                  {formatIntegrationWhen(job.completedAt)} · Retries{" "}
                  {job.retryCount}
                </p>
                {job.failureReason ? (
                  <p className="text-xs text-destructive">{job.failureReason}</p>
                ) : null}
              </div>
              {showActions ? (
                <div className="flex gap-2">
                  {(job.status === "FAILED" || job.status === "CANCELLED") && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => onRetry(job.id)}
                    >
                      Retry
                    </Button>
                  )}
                  {(job.status === "PENDING" || job.status === "RUNNING") && (
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busy}
                      onClick={() => onCancel(job.id)}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              ) : null}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function QueueTab({
  data,
  canManage,
  busy,
  onRetry,
  onCancel,
  onManualSync,
}: {
  data: IntegrationPlatformDetailDto["queue"];
  canManage: boolean;
  busy: boolean;
  onRetry: (jobId: string) => void;
  onCancel: (jobId: string) => void;
  onManualSync: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 text-sm">
          <IntegrationMetric label="Queue Length" value={String(data.queueLength)} />
          <IntegrationMetric label="Pending" value={String(data.pendingJobs)} />
          <IntegrationMetric label="Running" value={String(data.runningJobs)} />
          <IntegrationMetric label="Failed" value={String(data.failedJobs)} />
          <IntegrationMetric label="Completed" value={String(data.completedJobs)} />
        </div>
        {canManage ? (
          <Button size="sm" disabled={busy} onClick={onManualSync}>
            Manual Sync
          </Button>
        ) : null}
      </div>
      <SyncJobsList
        jobs={data.jobs}
        title="Queue Jobs"
        canManage={canManage}
        busy={busy}
        onRetry={onRetry}
        onCancel={onCancel}
      />
    </div>
  );
}

export function UsageTab({
  data,
}: {
  data: IntegrationPlatformDetailDto["usage"];
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 text-sm">
        <IntegrationMetric label="Requests Today" value={String(data.requestsToday)} />
        <IntegrationMetric label="Monthly Requests" value={String(data.monthlyRequests)} />
        <IntegrationMetric
          label="Remaining Quota"
          value={
            data.remainingQuota == null ? "—" : String(data.remainingQuota)
          }
        />
        <IntegrationMetric
          label="Rate Limit"
          value={
            data.rateLimitPerMinute == null
              ? "—"
              : `${data.rateLimitPerMinute}/min`
          }
        />
        <IntegrationMetric
          label="Avg Response"
          value={
            data.averageResponseMs == null
              ? "—"
              : `${data.averageResponseMs} ms`
          }
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <LineChart data={data.dailyRequests} title="Daily Requests" />
        <AreaChart data={data.weeklyRequests} title="Weekly Requests" />
        <BarChart
          data={data.monthlyRequestsSeries}
          title="Monthly Requests"
        />
        <LineChart data={data.successRequests} title="Success Requests" />
        <LineChart data={data.failedRequests} title="Failed Requests" />
        <AreaChart
          data={data.averageResponseTimeSeries}
          title="Average Response Time"
        />
      </div>
    </div>
  );
}

export function WebhooksTab({
  data,
}: {
  data: IntegrationPlatformDetailDto["webhooks"];
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
        <IntegrationMetric label="Total Webhooks" value={String(data.totalWebhooks)} />
        <IntegrationMetric label="Active" value={String(data.active)} />
        <IntegrationMetric label="Disabled" value={String(data.disabled)} />
        <IntegrationMetric
          label="Failed Deliveries"
          value={String(data.failedDeliveries)}
        />
        <IntegrationMetric
          label="Successful Deliveries"
          value={String(data.successfulDeliveries)}
        />
        <IntegrationMetric label="Retry Count" value={String(data.retryCount)} />
        <IntegrationMetric
          label="Avg Delivery Time"
          value={
            data.averageDeliveryTimeMs == null
              ? "—"
              : `${data.averageDeliveryTimeMs} ms`
          }
        />
        <IntegrationMetric
          label="Last Delivery"
          value={formatIntegrationWhen(data.lastDeliveryAt)}
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Webhook History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {data.endpoints.length === 0 ? (
            <p className="text-muted-foreground">No webhook endpoints.</p>
          ) : (
            data.endpoints.map((hook) => (
              <div
                key={hook.id}
                className="flex items-center justify-between gap-3 border-b border-border/40 pb-2 last:border-0"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{hook.url}</p>
                  <p className="text-muted-foreground">
                    {hook.events.join(", ") || "No events"} · Last status{" "}
                    {hook.lastDeliveryStatus ?? "—"}
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
    </div>
  );
}

export function AlertsTab({
  alerts,
  canManage,
  busy,
  onAcknowledge,
  onEvaluate,
}: {
  alerts: IntegrationPlatformDetailDto["alerts"];
  canManage: boolean;
  busy: boolean;
  onAcknowledge: (id: string) => void;
  onEvaluate: () => void;
}) {
  return (
    <div className="space-y-4">
      {canManage ? (
        <Button size="sm" variant="outline" disabled={busy} onClick={onEvaluate}>
          Evaluate Alerts
        </Button>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alerts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {alerts.length === 0 ? (
            <p className="text-muted-foreground">No alerts.</p>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex flex-col gap-2 border-b border-border/40 pb-3 last:border-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{alert.title}</p>
                    <Badge variant="outline">{alert.severity}</Badge>
                    <Badge variant="outline">{alert.type}</Badge>
                  </div>
                  <p className="text-muted-foreground">{alert.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatIntegrationWhen(alert.createdAt)}
                  </p>
                </div>
                {canManage && !alert.acknowledged ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => onAcknowledge(alert.id)}
                  >
                    Acknowledge
                  </Button>
                ) : (
                  <Badge variant={alert.acknowledged ? "secondary" : "warning"}>
                    {alert.acknowledged ? "Acknowledged" : "Open"}
                  </Badge>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function ConfigurationTab({
  configuration,
  scheduler,
  canManage,
  busy,
  onSaveScheduler,
}: {
  configuration: IntegrationPlatformDetailDto["configuration"];
  scheduler: IntegrationPlatformDetailDto["scheduler"];
  canManage: boolean;
  busy: boolean;
  onSaveScheduler: (input: {
    enabled: boolean;
    preset: string;
    cronExpression: string;
  }) => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuration</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <IntegrationMetric
            label="Connection Mode"
            value={configuration.connectionMode ?? "—"}
          />
          <IntegrationMetric label="API Version" value={configuration.apiVersion ?? "—"} />
          <IntegrationMetric
            label="Account"
            value={configuration.accountLabel ?? "—"}
          />
          <IntegrationMetric label="Phase" value={configuration.phase ?? "—"} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sync Scheduler</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Architecture only — schedules are stored; cron execution is deferred.
          </p>
          <IntegrationMetric
            label="Enabled"
            value={scheduler.enabled ? "Yes" : "No"}
          />
          <IntegrationMetric label="Preset" value={scheduler.preset} />
          <IntegrationMetric
            label="Next Run"
            value={formatIntegrationWhen(scheduler.nextRunAt)}
          />
          {canManage ? (
            <SchedulerForm
              busy={busy}
              initialEnabled={scheduler.enabled}
              initialPreset={scheduler.preset}
              initialCron={scheduler.cronExpression ?? ""}
              onSave={onSaveScheduler}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function SchedulerForm({
  busy,
  initialEnabled,
  initialPreset,
  initialCron,
  onSave,
}: {
  busy: boolean;
  initialEnabled: boolean;
  initialPreset: string;
  initialCron: string;
  onSave: (input: {
    enabled: boolean;
    preset: string;
    cronExpression: string;
  }) => void;
}) {
  return (
    <form
      className="space-y-3 border-t border-border/50 pt-3"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        onSave({
          enabled: form.get("enabled") === "on",
          preset: String(form.get("preset") || "hourly"),
          cronExpression: String(form.get("cron") || ""),
        });
      }}
    >
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="enabled"
          defaultChecked={initialEnabled}
        />
        Enable scheduled sync
      </label>
      <div className="space-y-2">
        <Label htmlFor="scheduler-preset">Preset</Label>
        <select
          id="scheduler-preset"
          name="preset"
          defaultValue={initialPreset}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="every_5_minutes">Every 5 Minutes</option>
          <option value="every_15_minutes">Every 15 Minutes</option>
          <option value="every_30_minutes">Every 30 Minutes</option>
          <option value="hourly">Hourly</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="custom_cron">Custom Cron Expression</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="scheduler-cron">Custom Cron</Label>
        <Input
          id="scheduler-cron"
          name="cron"
          defaultValue={initialCron}
          placeholder="0 */6 * * *"
        />
      </div>
      <Button type="submit" size="sm" disabled={busy}>
        Save Scheduler
      </Button>
    </form>
  );
}
