"use client";

import {
  Download,
  Play,
  RefreshCw,
  Shield,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";

import { ErrorState } from "@/components/common/feedback/error-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRole } from "@/features/rbac/hooks/use-permissions";
import { ApiClientError, getApiErrorMessage } from "@/services/api/api-error";

import {
  useApiVersioningStatus,
  useBackupValidationStatus,
  useDisasterRecoveryStatus,
  useEncryptionAuditStatus,
  useRetentionStatus,
  useSecurityOpsMutations,
  useSiemStatus,
  useWebhookSecurityStatus,
} from "../hooks/use-security";

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function Meta({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

export function SecurityOpsPanel() {
  const { isAdmin } = useRole();
  const ops = useSecurityOpsMutations();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const retention = useRetentionStatus(isAdmin);
  const siem = useSiemStatus(isAdmin);
  const backup = useBackupValidationStatus(isAdmin);
  const encryption = useEncryptionAuditStatus(isAdmin);
  const dr = useDisasterRecoveryStatus(isAdmin);
  const webhooks = useWebhookSecurityStatus(isAdmin);
  const apiVersioning = useApiVersioningStatus(isAdmin);

  if (!isAdmin) return null;

  async function runAction(
    label: string,
    action: () => Promise<unknown>,
  ) {
    setError(null);
    setMessage(null);
    try {
      await action();
      setMessage(`${label} completed.`);
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 403) {
        setError("Permission denied for this admin operation.");
        return;
      }
      setError(getApiErrorMessage(err, `${label} failed.`));
    }
  }

  async function handleExportAudit() {
    setError(null);
    setMessage(null);
    try {
      const result = await ops.exportAuditLogs.mutateAsync();
      const blob = new Blob([JSON.stringify(result, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `audit-export-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage(
        `Audit export ready (${result.items.length} items, chain ${result.chainValid ? "valid" : "invalid"}).`,
      );
    } catch (err) {
      setError(getApiErrorMessage(err, "Audit export failed."));
    }
  }

  const anyStatusError =
    retention.isError ||
    siem.isError ||
    backup.isError ||
    encryption.isError ||
    dr.isError ||
    webhooks.isError ||
    apiVersioning.isError;

  const pending =
    ops.verifyAuditChain.isPending ||
    ops.exportAuditLogs.isPending ||
    ops.runRetention.isPending ||
    ops.testSiem.isPending ||
    ops.runBackupValidation.isPending ||
    ops.runEncryptionAudit.isPending ||
    ops.runDisasterRecovery.isPending;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Admin security operations
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Run integrity checks and view live status for enterprise security
            controls.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => {
            void retention.refetch();
            void siem.refetch();
            void backup.refetch();
            void encryption.refetch();
            void dr.refetch();
            void webhooks.refetch();
            void apiVersioning.refetch();
          }}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh status
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {message ? (
          <p className="text-sm text-emerald-700 dark:text-emerald-300" role="status">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        {anyStatusError ? (
          <ErrorState
            title="Unable to load some admin status endpoints"
            description="You may lack access, or a subsystem is unavailable."
            className="min-h-28 py-6 sm:min-h-32"
            onRetry={() => {
              void retention.refetch();
              void siem.refetch();
              void backup.refetch();
              void encryption.refetch();
              void dr.refetch();
              void webhooks.refetch();
              void apiVersioning.refetch();
            }}
          />
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              void runAction("Audit chain verify", () =>
                ops.verifyAuditChain.mutateAsync(),
              )
            }
          >
            <Shield className="mr-2 h-4 w-4" />
            Verify audit chain
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => void handleExportAudit()}
          >
            <Download className="mr-2 h-4 w-4" />
            Export audit JSON
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              void runAction("Retention processor", () =>
                ops.runRetention.mutateAsync(),
              )
            }
          >
            <Play className="mr-2 h-4 w-4" />
            Run retention
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              void runAction("SIEM test event", () =>
                ops.testSiem.mutateAsync(),
              )
            }
          >
            <Play className="mr-2 h-4 w-4" />
            Send Test Event
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              void runAction("Backup validation", () =>
                ops.runBackupValidation.mutateAsync(),
              )
            }
          >
            <Play className="mr-2 h-4 w-4" />
            Run backup validation
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              void runAction("Encryption audit", () =>
                ops.runEncryptionAudit.mutateAsync(),
              )
            }
          >
            <Play className="mr-2 h-4 w-4" />
            Run encryption audit
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              void runAction("Disaster recovery test", () =>
                ops.runDisasterRecovery.mutateAsync(),
              )
            }
          >
            <Play className="mr-2 h-4 w-4" />
            Run DR test
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <StatusCard title="Retention">
            {retention.isLoading ? (
              <p className="text-xs text-muted-foreground">Loading…</p>
            ) : retention.data ? (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Meta
                  label="Last run"
                  value={formatWhen(retention.data.lastRun?.finishedAt)}
                />
                <Meta
                  label="Last status"
                  value={retention.data.lastRun?.status ?? "—"}
                />
                <Meta
                  label="Legal holds"
                  value={retention.data.activeLegalHolds}
                />
                <Meta label="Policies" value={retention.data.policies.length} />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No data</p>
            )}
          </StatusCard>

          <StatusCard title="SIEM">
            {siem.isLoading ? (
              <p className="text-xs text-muted-foreground">Loading…</p>
            ) : siem.data ? (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Meta label="Enabled" value={siem.data.enabled ? "Yes" : "No"} />
                <Meta label="Connection" value={siem.data.connectionStatus} />
                <Meta
                  label="Providers"
                  value={
                    siem.data.connectedProviders.length > 0
                      ? siem.data.connectedProviders.join(", ")
                      : "—"
                  }
                />
                <Meta label="Queue" value={siem.data.queueSize} />
                <Meta label="Failed" value={siem.data.failedDeliveries} />
                <Meta
                  label="Dead letter"
                  value={siem.data.deadLetterSize}
                />
                <Meta
                  label="Last error"
                  value={siem.data.lastError ? "See details" : "None"}
                />
                {siem.data.lastError ? (
                  <p className="col-span-2 text-xs text-destructive break-words">
                    {siem.data.lastError}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No data</p>
            )}
          </StatusCard>

          <StatusCard title="Backup validation">
            {backup.isLoading ? (
              <p className="text-xs text-muted-foreground">Loading…</p>
            ) : backup.data ? (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Meta
                  label="Enabled"
                  value={backup.data.enabled ? "Yes" : "No"}
                />
                <Meta label="Health" value={backup.data.health} />
                <Meta label="Coverage" value={`${backup.data.coveragePercent}%`} />
                <Meta
                  label="Last run"
                  value={formatWhen(backup.data.lastValidationAt)}
                />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No data</p>
            )}
          </StatusCard>

          <StatusCard title="Encryption audit">
            {encryption.isLoading ? (
              <p className="text-xs text-muted-foreground">Loading…</p>
            ) : encryption.data ? (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Meta label="Status" value={encryption.data.status} />
                <Meta label="Score" value={encryption.data.overallScore} />
                <Meta
                  label="Coverage"
                  value={`${encryption.data.coveragePercent}%`}
                />
                <Meta
                  label="Last audit"
                  value={formatWhen(encryption.data.lastAuditAt)}
                />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No data</p>
            )}
          </StatusCard>

          <StatusCard title="Disaster recovery">
            {dr.isLoading ? (
              <p className="text-xs text-muted-foreground">Loading…</p>
            ) : dr.data ? (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Meta label="Status" value={dr.data.status} />
                <Meta label="Readiness" value={`${dr.data.readiness}%`} />
                <Meta label="Success rate" value={`${dr.data.successRate}%`} />
                <Meta label="Last test" value={formatWhen(dr.data.lastTestAt)} />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No data</p>
            )}
          </StatusCard>

          <StatusCard title="Signed webhooks">
            {webhooks.isLoading ? (
              <p className="text-xs text-muted-foreground">Loading…</p>
            ) : webhooks.data ? (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Meta
                  label="Enabled"
                  value={webhooks.data.enabled ? "Yes" : "No"}
                />
                <Meta label="Key" value={webhooks.data.keyIdMasked} />
                <Meta label="Deliveries" value={webhooks.data.deliveries} />
                <Meta label="Failures" value={webhooks.data.failures} />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No data</p>
            )}
          </StatusCard>

          <StatusCard title="API versioning">
            {apiVersioning.isLoading ? (
              <p className="text-xs text-muted-foreground">Loading…</p>
            ) : apiVersioning.data ? (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Meta
                  label="Enabled"
                  value={apiVersioning.data.enabled ? "Yes" : "No"}
                />
                <Meta label="Default" value={apiVersioning.data.defaultVersion} />
                <Meta label="Latest" value={apiVersioning.data.latestVersion} />
                <Meta label="Traffic" value={apiVersioning.data.traffic} />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No data</p>
            )}
          </StatusCard>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}
