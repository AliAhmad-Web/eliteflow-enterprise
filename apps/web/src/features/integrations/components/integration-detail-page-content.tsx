"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeft } from "lucide-react";

import { ErrorState } from "@/components/common/feedback/error-state";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiClientError } from "@/services/api/api-error";
import { cn } from "@/lib/utils";
import type { SyncSchedulerPresetValue } from "@enterprise/shared";

import {
  useConnectIntegration,
  useDisconnectIntegration,
  useTestIntegration,
} from "../hooks/use-integrations-mutations";
import {
  useIntegrationBySlug,
  useIntegrationPlatformDetail,
  useIntegrationsOverview,
} from "../hooks/use-integrations";
import {
  useAcknowledgeAlert,
  useCancelSync,
  useEvaluateAlerts,
  useManualSync,
  useRetrySync,
  useUpdateScheduler,
} from "../hooks/use-monitoring-mutations";
import { isApiKeySlug } from "../lib/api-key-providers";
import { formatIntegrationWhen } from "../lib/integration-ui";
import { ConnectApiKeyDialog } from "./connect-api-key-dialog";
import {
  AlertsTab,
  ConfigurationTab,
  MonitoringTab,
  QueueTab,
  SyncJobsList,
  UsageTab,
  WebhooksTab,
} from "./integration-monitoring-tabs";

const IntegrationDetailPanel = dynamic(
  () =>
    import("./integration-detail-panel").then(
      (mod) => mod.IntegrationDetailPanel,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-lg border border-border/50 p-6">
        <LoadingState label="Loading connection details" />
      </div>
    ),
  },
);

const TABS = [
  "Overview",
  "Monitoring",
  "Queue",
  "Sync History",
  "Webhook History",
  "Logs",
  "API Usage",
  "Alerts",
  "Configuration",
] as const;

type TabId = (typeof TABS)[number];

export function IntegrationDetailPageContent() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [tab, setTab] = useState<TabId>("Overview");
  const overviewQuery = useIntegrationsOverview();
  const detailQuery = useIntegrationBySlug(slug);
  const platformQuery = useIntegrationPlatformDetail(slug, true);
  const connectMutation = useConnectIntegration();
  const disconnectMutation = useDisconnectIntegration();
  const testMutation = useTestIntegration();
  const manualSync = useManualSync(slug);
  const retrySync = useRetrySync();
  const cancelSync = useCancelSync();
  const updateScheduler = useUpdateScheduler(slug);
  const acknowledgeAlert = useAcknowledgeAlert();
  const evaluateAlerts = useEvaluateAlerts();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);

  const canManage = overviewQuery.data?.canManage ?? false;
  const detail = detailQuery.data;
  const platform = platformQuery.data;
  const busy =
    isPending ||
    connectMutation.isPending ||
    disconnectMutation.isPending ||
    testMutation.isPending ||
    manualSync.isPending ||
    retrySync.isPending ||
    cancelSync.isPending ||
    updateScheduler.isPending ||
    acknowledgeAlert.isPending ||
    evaluateAlerts.isPending;

  if (detailQuery.isLoading || platformQuery.isLoading) {
    return <LoadingState label="Loading integration platform" />;
  }

  if (detailQuery.isError || !detail || platformQuery.isError || !platform) {
    return (
      <ErrorState
        title="Integration not found"
        description={
          detailQuery.error instanceof ApiClientError
            ? detailQuery.error.message
            : platformQuery.error instanceof ApiClientError
              ? platformQuery.error.message
              : "Unable to load this integration."
        }
      />
    );
  }

  function runAction(action: () => void) {
    setError(null);
    setMessage(null);
    startTransition(action);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader title={detail.name} description={detail.description} />
        <Button asChild variant="outline" size="sm" className="shrink-0">
          <Link href="/integrations">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Integrations
          </Link>
        </Button>
      </div>

      {(message || error) && (
        <p
          className={
            error
              ? "rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              : "rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-700"
          }
        >
          {error || message}
        </p>
      )}

      {canManage ? (
        <div className="flex flex-wrap gap-2">
          {detail.isConnected ? (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() =>
                  runAction(() => {
                    testMutation.mutate(detail, {
                      onSuccess: (r) => setMessage(r.message),
                      onError: (e) =>
                        setError(
                          e instanceof ApiClientError
                            ? e.message
                            : "Test failed",
                        ),
                    });
                  })
                }
              >
                Test Connection
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={busy}
                onClick={() =>
                  runAction(() => {
                    disconnectMutation.mutate(detail, {
                      onSuccess: (r) => setMessage(r.message),
                      onError: (e) =>
                        setError(
                          e instanceof ApiClientError
                            ? e.message
                            : "Disconnect failed",
                        ),
                    });
                  })
                }
              >
                Disconnect
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              disabled={busy}
              onClick={() => {
                if (isApiKeySlug(detail.slug)) {
                  setConnectOpen(true);
                  return;
                }
                runAction(() => {
                  connectMutation.mutate(detail, {
                    onSuccess: (r) => {
                      if (r.authorizeUrl) return;
                      setMessage(r.message);
                    },
                    onError: (e) =>
                      setError(
                        e instanceof ApiClientError
                          ? e.message
                          : "Connect failed",
                      ),
                  });
                });
              }}
            >
              Connect
            </Button>
          )}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 border-b border-border/50 pb-2">
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm transition-colors",
              tab === item
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === "Overview" ? (
        <IntegrationDetailPanel detail={detail} canManage={canManage} />
      ) : null}

      {tab === "Monitoring" ? (
        <MonitoringTab data={platform.monitoring} />
      ) : null}

      {tab === "Queue" ? (
        <QueueTab
          data={platform.queue}
          canManage={canManage}
          busy={busy}
          onManualSync={() =>
            runAction(() => {
              manualSync.mutate(
                { direction: "inbound" },
                {
                  onSuccess: () => setMessage("Manual sync completed."),
                  onError: (e) =>
                    setError(
                      e instanceof ApiClientError ? e.message : "Sync failed",
                    ),
                },
              );
            })
          }
          onRetry={(jobId) =>
            runAction(() => {
              retrySync.mutate(jobId, {
                onSuccess: () => setMessage("Sync job retried."),
                onError: (e) =>
                  setError(
                    e instanceof ApiClientError ? e.message : "Retry failed",
                  ),
              });
            })
          }
          onCancel={(jobId) =>
            runAction(() => {
              cancelSync.mutate(jobId, {
                onSuccess: () => setMessage("Sync job cancelled."),
                onError: (e) =>
                  setError(
                    e instanceof ApiClientError ? e.message : "Cancel failed",
                  ),
              });
            })
          }
        />
      ) : null}

      {tab === "Sync History" ? (
        <SyncJobsList
          jobs={platform.queue.jobs}
          title="Sync History"
          emptyLabel="No sync history yet."
        />
      ) : null}

      {tab === "Webhook History" ? (
        <WebhooksTab data={platform.webhooks} />
      ) : null}

      {tab === "Logs" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Logs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {detail.recentLogs.length === 0 ? (
              <p className="text-muted-foreground">No logs yet.</p>
            ) : (
              detail.recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="border-b border-border/40 pb-2 last:border-0"
                >
                  <p className="font-medium">{log.action}</p>
                  <p className="text-muted-foreground">{log.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatIntegrationWhen(log.createdAt)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "API Usage" ? <UsageTab data={platform.usage} /> : null}

      {tab === "Alerts" ? (
        <AlertsTab
          alerts={platform.alerts}
          canManage={canManage}
          busy={busy}
          onAcknowledge={(id) =>
            runAction(() => {
              acknowledgeAlert.mutate(id, {
                onSuccess: () => setMessage("Alert acknowledged."),
                onError: (e) =>
                  setError(
                    e instanceof ApiClientError
                      ? e.message
                      : "Acknowledge failed",
                  ),
              });
            })
          }
          onEvaluate={() =>
            runAction(() => {
              evaluateAlerts.mutate(undefined, {
                onSuccess: (items) =>
                  setMessage(`Evaluated alerts (${items.length} raised).`),
                onError: (e) =>
                  setError(
                    e instanceof ApiClientError
                      ? e.message
                      : "Evaluate failed",
                  ),
              });
            })
          }
        />
      ) : null}

      {tab === "Configuration" ? (
        <ConfigurationTab
          configuration={platform.configuration}
          scheduler={platform.scheduler}
          canManage={canManage}
          busy={busy}
          onSaveScheduler={(input) =>
            runAction(() => {
              updateScheduler.mutate(
                {
                  enabled: input.enabled,
                  preset: input.preset as SyncSchedulerPresetValue,
                  cronExpression: input.cronExpression || null,
                },
                {
                  onSuccess: () => setMessage("Scheduler configuration saved."),
                  onError: (e) =>
                    setError(
                      e instanceof ApiClientError
                        ? e.message
                        : "Scheduler update failed",
                    ),
                },
              );
            })
          }
        />
      ) : null}

      <ConnectApiKeyDialog
        open={connectOpen}
        slug={detail.slug}
        name={detail.name}
        onOpenChange={setConnectOpen}
        onSubmit={(secret) => {
          setConnectOpen(false);
          runAction(() => {
            connectMutation.mutate(
              { slug: detail.slug as never, secret },
              {
                onSuccess: (r) => setMessage(r.message),
                onError: (e) =>
                  setError(
                    e instanceof ApiClientError ? e.message : "Connect failed",
                  ),
              },
            );
          });
        }}
      />
    </div>
  );
}
