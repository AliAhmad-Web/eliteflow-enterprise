"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Activity,
  CheckCircle2,
  Link2,
  Link2Off,
  Percent,
  Plug,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";

import { EmptyState } from "@/components/common/feedback/empty-state";
import { ErrorState } from "@/components/common/feedback/error-state";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ApiClientError } from "@/services/api/api-error";
import { cn } from "@/lib/utils";
import type { IntegrationDto } from "@enterprise/shared";

import {
  useConnectIntegration,
  useDisconnectIntegration,
  useTestIntegration,
} from "../hooks/use-integrations-mutations";
import {
  useIntegrationDetail,
  useIntegrationsOverview,
  useMonitoringOverview,
  useSyncHistory,
} from "../hooks/use-integrations";
import { isApiKeySlug } from "../lib/api-key-providers";
import {
  connectionBadgeVariant,
  formatIntegrationWhen,
  getIntegrationLogo,
  healthBadgeVariant,
  statusBadgeVariant,
} from "../lib/integration-ui";
import { ConnectApiKeyDialog } from "./connect-api-key-dialog";

const IntegrationDetailPanel = dynamic(
  () =>
    import("./integration-detail-panel").then((mod) => mod.IntegrationDetailPanel),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-lg border border-border/50 p-6">
        <LoadingState label="Loading connection details" />
      </div>
    ),
  },
);

type ConnectedFilter = "all" | "connected" | "disconnected";
type HealthFilter = "all" | IntegrationDto["healthStatus"];

function OverviewMetric({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: typeof Plug;
  tone: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div
          className={cn(
            "icon-box icon-box-md rounded-lg",
            tone,
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function IntegrationCard({
  integration,
  canManage,
  selected,
  busy,
  onSelect,
  onConnect,
  onDisconnect,
  onTest,
}: {
  integration: IntegrationDto;
  canManage: boolean;
  selected: boolean;
  busy: boolean;
  onSelect: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onTest: () => void;
}) {
  const logo = getIntegrationLogo(integration);
  const LogoIcon = logo.icon;

  return (
    <Card
      className={cn(
        "transition-colors",
        selected && "border-primary/50 ring-1 ring-primary/20",
      )}
    >
      <CardHeader className="space-y-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={onSelect}
            className="flex min-w-0 flex-1 items-start gap-3 text-left"
          >
            <div
              className={cn(
                "icon-box icon-box-md rounded-lg",
                logo.accent,
              )}
            >
              <LogoIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0 space-y-1">
              <CardTitle className="text-base">{integration.name}</CardTitle>
              <p className="line-clamp-2 text-sm text-muted-foreground">
                {integration.description}
              </p>
            </div>
          </button>
          <Badge variant={connectionBadgeVariant(integration.isConnected)}>
            {integration.isConnected ? "Connected" : "Not Connected"}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={statusBadgeVariant(integration.status)}>
            {integration.status.replaceAll("_", " ")}
          </Badge>
          <Badge variant={healthBadgeVariant(integration.healthStatus)}>
            Health: {integration.healthStatus}
          </Badge>
          <Badge variant="outline" className="capitalize">
            {integration.category}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground">Last Sync</p>
            <p className="font-medium">
              {formatIntegrationWhen(integration.lastSyncAt)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">API Version</p>
            <p className="font-medium">{integration.apiVersion ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Success Rate</p>
            <p className="font-medium">
              {integration.successRate == null
                ? "—"
                : `${integration.successRate}%`}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Last Error</p>
            <p className="line-clamp-2 font-medium text-destructive">
              {integration.lastError ?? "None"}
            </p>
          </div>
        </div>

        {canManage ? (
          <div className="flex flex-wrap gap-2">
            {integration.isConnected ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={onTest}
                >
                  Test
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={busy}
                  onClick={onDisconnect}
                >
                  Disconnect
                </Button>
              </>
            ) : (
              <Button
                type="button"
                size="sm"
                disabled={busy}
                onClick={onConnect}
              >
                Connect
              </Button>
            )}
            <Button asChild type="button" variant="ghost" size="sm">
              <Link href={`/integrations/${integration.slug}`}>Details</Link>
            </Button>
          </div>
        ) : (
          <Button asChild type="button" variant="outline" size="sm">
            <Link href={`/integrations/${integration.slug}`}>View details</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function IntegrationsCenterPageContent() {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [connectedFilter, setConnectedFilter] =
    useState<ConnectedFilter>("all");
  const [healthFilter, setHealthFilter] = useState<HealthFilter>("all");
  const [category, setCategory] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [apiKeyConnect, setApiKeyConnect] = useState<IntegrationDto | null>(
    null,
  );

  useEffect(() => {
    const oauth = searchParams.get("oauth");
    const provider = searchParams.get("provider");
    const reason = searchParams.get("reason");
    if (oauth === "success") {
      setActionMessage(
        provider
          ? `${provider} connected successfully.`
          : "OAuth connection completed.",
      );
    } else if (oauth === "error") {
      setActionError(reason || "OAuth connection failed.");
    }
  }, [searchParams]);

  const listFilters = useMemo(
    () => ({
      search: deferredSearch || undefined,
      connected:
        connectedFilter === "all"
          ? undefined
          : connectedFilter === "connected"
            ? ("true" as const)
            : ("false" as const),
      healthStatus: healthFilter === "all" ? undefined : healthFilter,
      category: category === "all" ? undefined : category,
    }),
    [deferredSearch, connectedFilter, healthFilter, category],
  );

  const overviewQuery = useIntegrationsOverview(listFilters);
  const monitoringQuery = useMonitoringOverview(true);
  const detailQuery = useIntegrationDetail(selectedId);
  const historyQuery = useSyncHistory({ page: 1, pageSize: 8 });

  const connectMutation = useConnectIntegration();
  const disconnectMutation = useDisconnectIntegration();
  const testMutation = useTestIntegration();

  const busy =
    isPending ||
    connectMutation.isPending ||
    disconnectMutation.isPending ||
    testMutation.isPending;

  const data = overviewQuery.data;
  const categories = useMemo(() => {
    const set = new Set(
      (data?.integrations ?? []).map((item) => item.category),
    );
    return Array.from(set).sort();
  }, [data?.integrations]);

  function clearFeedback() {
    setActionError(null);
    setActionMessage(null);
  }

  function handleConnect(integration: IntegrationDto) {
    clearFeedback();
    if (isApiKeySlug(integration.slug)) {
      setApiKeyConnect(integration);
      return;
    }
    startTransition(() => {
      connectMutation.mutate(integration, {
        onSuccess: (result) => {
          if (result.authorizeUrl) return;
          setActionMessage(result.message);
          setSelectedId(integration.id);
        },
        onError: (error) => {
          setActionError(
            error instanceof ApiClientError
              ? error.message
              : "Failed to connect integration",
          );
        },
      });
    });
  }

  function handleApiKeyConnectSubmit(secret: string) {
    if (!apiKeyConnect) return;
    const integration = apiKeyConnect;
    setApiKeyConnect(null);
    startTransition(() => {
      connectMutation.mutate(
        { slug: integration.slug as never, secret },
        {
          onSuccess: (result) => {
            setActionMessage(result.message);
            setSelectedId(integration.id);
          },
          onError: (error) => {
            setActionError(
              error instanceof ApiClientError
                ? error.message
                : "Failed to connect integration",
            );
          },
        },
      );
    });
  }

  function handleDisconnect(integration: IntegrationDto) {
    clearFeedback();
    startTransition(() => {
      disconnectMutation.mutate(integration, {
        onSuccess: (result) => {
          setActionMessage(result.message);
          setSelectedId(integration.id);
        },
        onError: (error) => {
          setActionError(
            error instanceof ApiClientError
              ? error.message
              : "Failed to disconnect integration",
          );
        },
      });
    });
  }

  function handleTest(integration: IntegrationDto) {
    clearFeedback();
    startTransition(() => {
      testMutation.mutate(integration, {
        onSuccess: (result) => {
          setActionMessage(result.message);
          setSelectedId(integration.id);
        },
        onError: (error) => {
          setActionError(
            error instanceof ApiClientError
              ? error.message
              : "Health check failed",
          );
        },
      });
    });
  }

  if (overviewQuery.isLoading && !overviewQuery.data) {
    return <LoadingState label="Loading Integration Center" />;
  }

  if (overviewQuery.isError) {
    return (
      <ErrorState
        title="Unable to load integrations"
        description={
          overviewQuery.error instanceof ApiClientError
            ? overviewQuery.error.message
            : "Something went wrong while loading integrations."
        }
        onRetry={() => void overviewQuery.refetch()}
      />
    );
  }

  if (!data) {
    return (
      <EmptyState
        title="No integrations"
        description="Integration catalog is empty."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integration Center"
        description="Connect Gmail, Google Calendar, and GitHub with OAuth 2.0 (authorization code + PKCE). Feature sync is prepared for later phases."
        actionLabel="Refresh"
        onAction={() => void overviewQuery.refetch()}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <OverviewMetric
          label="Total Integrations"
          value={data.totalCount}
          icon={Plug}
          tone="bg-amber-500/10 text-amber-700"
        />
        <OverviewMetric
          label="Connected"
          value={data.connectedCount}
          icon={Link2}
          tone="bg-emerald-500/10 text-emerald-600"
        />
        <OverviewMetric
          label="Disconnected"
          value={data.disconnectedCount}
          icon={Link2Off}
          tone="bg-muted text-muted-foreground"
        />
        <OverviewMetric
          label="Healthy"
          value={data.healthyCount}
          icon={ShieldCheck}
          tone="bg-sky-500/10 text-sky-600"
        />
        <OverviewMetric
          label="Failed"
          value={data.failedCount}
          icon={XCircle}
          tone="bg-destructive/10 text-destructive"
        />
        <OverviewMetric
          label="Sync Jobs Today"
          value={data.syncJobsToday}
          icon={Activity}
          tone="bg-violet-500/10 text-violet-600"
        />
        <OverviewMetric
          label="Success Rate"
          value={`${data.successRate}%`}
          icon={Percent}
          tone="bg-emerald-500/10 text-emerald-700"
        />
        <OverviewMetric
          label="Health Score"
          value={`${data.healthScore}%`}
          icon={CheckCircle2}
          tone="bg-sky-500/10 text-sky-700"
        />
        <OverviewMetric
          label="Queue Length"
          value={monitoringQuery.data?.queueLength ?? 0}
          icon={Activity}
          tone="bg-amber-500/10 text-amber-700"
        />
        <OverviewMetric
          label="Open Alerts"
          value={monitoringQuery.data?.openAlertCount ?? 0}
          icon={XCircle}
          tone="bg-destructive/10 text-destructive"
        />
        <OverviewMetric
          label="Avg Uptime"
          value={`${monitoringQuery.data?.averageUptimePercentage ?? 100}%`}
          icon={ShieldCheck}
          tone="bg-emerald-500/10 text-emerald-700"
        />
      </div>

      {(actionMessage || actionError) && (
        <div
          className={cn(
            "rounded-lg border px-4 py-3 text-sm",
            actionError
              ? "border-destructive/40 bg-destructive/5 text-destructive"
              : "border-emerald-500/30 bg-emerald-500/5 text-emerald-700",
          )}
        >
          {actionError ?? actionMessage}
        </div>
      )}

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search integrations…"
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={connectedFilter}
              onChange={(event) =>
                setConnectedFilter(event.target.value as ConnectedFilter)
              }
            >
              <option value="all">All statuses</option>
              <option value="connected">Connected</option>
              <option value="disconnected">Not connected</option>
            </select>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={healthFilter}
              onChange={(event) =>
                setHealthFilter(event.target.value as HealthFilter)
              }
            >
              <option value="all">All health</option>
              <option value="HEALTHY">Healthy</option>
              <option value="DEGRADED">Degraded</option>
              <option value="UNHEALTHY">Unhealthy</option>
              <option value="UNKNOWN">Unknown</option>
            </select>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="all">All categories</option>
              {categories.map((item) => (
                <option key={item} value={item} className="capitalize">
                  {item}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {data.integrations.length === 0 ? (
        <EmptyState
          title="No matching integrations"
          description="Try adjusting search or filters."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 min-[2560px]:grid-cols-4">
          {data.integrations.map((integration) => (
            <IntegrationCard
              key={integration.id}
              integration={integration}
              canManage={data.canManage}
              selected={selectedId === integration.id}
              busy={busy}
              onSelect={() => setSelectedId(integration.id)}
              onConnect={() => handleConnect(integration)}
              onDisconnect={() => handleDisconnect(integration)}
              onTest={() => handleTest(integration)}
            />
          ))}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2 min-[2560px]:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4" />
              Recent Sync History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {historyQuery.isLoading ? (
              <LoadingState label="Loading sync history" />
            ) : (historyQuery.data?.items.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">
                No sync runs yet. Connect an integration to create history.
              </p>
            ) : (
              historyQuery.data?.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 border-b border-border/50 pb-3 last:border-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {item.integrationName ?? "Integration"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.message ?? item.status}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <Badge
                      variant={
                        item.status === "SUCCESS"
                          ? "success"
                          : item.status === "FAILED"
                            ? "destructive"
                            : "outline"
                      }
                    >
                      {item.status}
                    </Badge>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatIntegrationWhen(item.startedAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div>
          {selectedId ? (
            detailQuery.isLoading ? (
              <LoadingState label="Loading connection details" />
            ) : detailQuery.data ? (
              <IntegrationDetailPanel
                detail={detailQuery.data}
                canManage={data.canManage}
              />
            ) : (
              <EmptyState
                title="Details unavailable"
                description="Select another integration to view connection details."
              />
            )
          ) : (
            <Card>
              <CardContent className="flex min-h-[220px] items-center justify-center p-6 text-sm text-muted-foreground">
                Select an integration to inspect connection details, webhooks,
                and recent logs.
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <ConnectApiKeyDialog
        open={Boolean(apiKeyConnect)}
        slug={apiKeyConnect?.slug ?? ""}
        name={apiKeyConnect?.name ?? "Integration"}
        onOpenChange={(open) => {
          if (!open) setApiKeyConnect(null);
        }}
        onSubmit={handleApiKeyConnectSubmit}
      />
    </div>
  );
}
