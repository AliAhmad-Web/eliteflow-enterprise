"use client";

import { changePasswordSchema, type ChangePasswordInput } from "@enterprise/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  Lock,
  MonitorSmartphone,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { EmptyState } from "@/components/common/feedback/empty-state";
import { ErrorState } from "@/components/common/feedback/error-state";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useHasPermission } from "@/features/rbac/hooks/use-permissions";
import { PERMISSIONS } from "@enterprise/shared";
import { ApiClientError } from "@/services/api/api-error";
import { cn } from "@/lib/utils";

import {
  useChangePasswordSecurity,
  useResolveSecurityAlert,
  useTerminateSecuritySession,
} from "../hooks/use-security-mutations";
import {
  useAuditLogs,
  useLoginHistory,
  useSecurityAlerts,
  useSecurityDashboard,
  useSecuritySessions,
} from "../hooks/use-security";
import { MfaEnrollmentCard } from "./mfa-enrollment-card";
import { SecurityOpsPanel } from "./security-ops-panel";

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function ScoreRing({ score, grade }: { score: number; grade: string }) {
  const color =
    score >= 75
      ? "text-emerald-500"
      : score >= 50
        ? "text-amber-500"
        : "text-destructive";

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={cn(
          "relative flex h-28 w-28 items-center justify-center rounded-full border-4",
          color,
        )}
        style={{ borderColor: "currentColor" }}
      >
        <div className="text-center">
          <p className="text-3xl font-semibold tracking-tight">{score}</p>
          <p className="text-xs uppercase tracking-wider opacity-70">
            Grade {grade}
          </p>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">Security score</p>
    </div>
  );
}

export function SecurityCenterPageContent() {
  const canReadAudit = useHasPermission(PERMISSIONS.AUDIT_READ);
  const dashboardQuery = useSecurityDashboard();
  const [loginPage, setLoginPage] = useState(1);
  const [sessionPage, setSessionPage] = useState(1);
  const [alertPage, setAlertPage] = useState(1);
  const [auditPage, setAuditPage] = useState(1);
  const [auditSearch, setAuditSearch] = useState("");
  const deferredSearch = useDeferredValue(auditSearch);

  const loginQuery = useLoginHistory(loginPage);
  const sessionsQuery = useSecuritySessions(sessionPage);
  const alertsQuery = useSecurityAlerts(alertPage);
  const auditQuery = useAuditLogs(auditPage, deferredSearch);

  const terminateMutation = useTerminateSecuritySession();
  const resolveMutation = useResolveSecurityAlert();
  const changePasswordMutation = useChangePasswordSecurity();

  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const data = dashboardQuery.data;

  const overviewCards = useMemo(() => {
    if (!data) return [];
    return [
      {
        label: "Active sessions",
        value: data.overview.activeSessions,
        icon: MonitorSmartphone,
      },
      {
        label: "Successful logins (24h)",
        value: data.overview.successfulLogins24h,
        icon: CheckCircle2,
      },
      {
        label: "Failed logins (24h)",
        value: data.overview.failedLogins24h,
        icon: AlertTriangle,
      },
      {
        label: "Open alerts",
        value: data.overview.unresolvedAlerts,
        icon: ShieldAlert,
      },
    ];
  }, [data]);

  async function onChangePassword(values: ChangePasswordInput) {
    setPasswordError(null);
    setPasswordMessage(null);
    try {
      const result = await changePasswordMutation.mutateAsync(values);
      setPasswordMessage(result.message);
      form.reset();
    } catch (error) {
      setPasswordError(
        error instanceof ApiClientError
          ? error.message
          : "Unable to change password",
      );
    }
  }

  if (dashboardQuery.isLoading) {
    return <LoadingState label="Loading security center" />;
  }

  if (dashboardQuery.isError) {
    const message =
      dashboardQuery.error instanceof ApiClientError
        ? dashboardQuery.error.message
        : "Failed to load security center";
    const denied =
      dashboardQuery.error instanceof ApiClientError &&
      dashboardQuery.error.status === 403;

    if (denied) {
      return (
        <EmptyState
          icon={Lock}
          title="Permission denied"
          description="You do not have access to the Security Center."
        />
      );
    }

    return (
      <ErrorState
        title="Unable to load security data"
        description={message}
        onRetry={() => void dashboardQuery.refetch()}
      />
    );
  }

  if (!data) {
    return (
      <EmptyState
        icon={Shield}
        title="No activity"
        description="Security telemetry will appear here once accounts are active."
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Security Center"
          description="Monitor sessions, logins, password health, and security alerts."
        />
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => void dashboardQuery.refetch()}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {overviewCards.map((card) => (
            <Card key={card.label}>
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.label}
                </CardTitle>
                <card.icon className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tracking-tight">
                  {card.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="flex items-center justify-center p-6">
          <ScoreRing
            score={data.securityScore.score}
            grade={data.securityScore.grade}
          />
        </Card>
      </div>

      {data.siemIntegration ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4 text-primary" />
              SIEM Integration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 text-sm">
              <div>
                <p className="text-muted-foreground">Connection</p>
                <p className="font-medium">
                  {data.siemIntegration.connectionStatus}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Queue size</p>
                <p className="font-medium">{data.siemIntegration.queueSize}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Failed deliveries</p>
                <p className="font-medium">
                  {data.siemIntegration.failedDeliveries}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Last export</p>
                <p className="font-medium">
                  {formatWhen(data.siemIntegration.lastExportAt)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Connected providers</p>
                <p className="font-medium">
                  {data.siemIntegration.connectedProviders.length > 0
                    ? data.siemIntegration.connectedProviders.join(", ")
                    : "None"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Event throughput (1h)</p>
                <p className="font-medium">
                  {data.siemIntegration.eventThroughput}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <SecurityOpsPanel />

      {data.backupValidation ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Backup Validation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 text-sm">
              <div>
                <p className="text-muted-foreground">Status</p>
                <p className="font-medium">{data.backupValidation.status}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Coverage</p>
                <p className="font-medium">{data.backupValidation.coverage}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">Health</p>
                <p className="font-medium">{data.backupValidation.health}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Failures</p>
                <p className="font-medium">{data.backupValidation.failures}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Last validation</p>
                <p className="font-medium">
                  {formatWhen(data.backupValidation.lastValidationAt)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Next validation</p>
                <p className="font-medium">
                  {formatWhen(data.backupValidation.nextValidationAt)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {data.encryptionAudit ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock className="h-4 w-4 text-primary" />
              Encryption Audit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 text-sm">
              <div>
                <p className="text-muted-foreground">Overall score</p>
                <p className="font-medium">
                  {data.encryptionAudit.overallScore}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Coverage</p>
                <p className="font-medium">{data.encryptionAudit.coverage}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">Weak algorithms</p>
                <p className="font-medium">
                  {data.encryptionAudit.weakAlgorithms}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Failed checks</p>
                <p className="font-medium">
                  {data.encryptionAudit.failedChecks}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Recommendations</p>
                <p className="font-medium">
                  {data.encryptionAudit.recommendations}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Last audit</p>
                <p className="font-medium">
                  {formatWhen(data.encryptionAudit.lastAuditAt)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {data.disasterRecoveryTest ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <RefreshCw className="h-4 w-4 text-primary" />
              Disaster Recovery Test
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 text-sm">
              <div>
                <p className="text-muted-foreground">Readiness</p>
                <p className="font-medium">
                  {data.disasterRecoveryTest.readiness}%
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Last test</p>
                <p className="font-medium">
                  {formatWhen(data.disasterRecoveryTest.lastTestAt)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Success rate</p>
                <p className="font-medium">
                  {data.disasterRecoveryTest.successRate}%
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Recovery time</p>
                <p className="font-medium">
                  {data.disasterRecoveryTest.recoveryTimeMs != null
                    ? `${data.disasterRecoveryTest.recoveryTimeMs} ms`
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Recommendations</p>
                <p className="font-medium">
                  {data.disasterRecoveryTest.recommendations}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {data.penetrationTest ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="h-4 w-4 text-primary" />
              Penetration Test Assessment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 text-sm">
              <div>
                <p className="text-muted-foreground">Overall score</p>
                <p className="font-medium">
                  {data.penetrationTest.overallScore}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Security maturity</p>
                <p className="font-medium">
                  {data.penetrationTest.securityMaturity ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Critical findings</p>
                <p className="font-medium">
                  {data.penetrationTest.criticalFindings}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">High findings</p>
                <p className="font-medium">
                  {data.penetrationTest.highFindings}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Recommendations</p>
                <p className="font-medium">
                  {data.penetrationTest.recommendations}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Last assessment</p>
                <p className="font-medium">
                  {formatWhen(data.penetrationTest.lastAssessmentAt)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Password status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-muted-foreground">Last changed</p>
                <p className="font-medium">
                  {formatWhen(data.passwordStatus.passwordChangedAt)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Last login</p>
                <p className="font-medium">
                  {formatWhen(data.passwordStatus.lastLoginAt)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">History depth</p>
                <p className="font-medium">
                  {data.passwordStatus.historyCount} /{" "}
                  {data.passwordStatus.reusePreventionCount}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">2FA</p>
                <p className="font-medium">
                  {data.passwordStatus.twoFactorEnabled
                    ? "Enabled"
                    : "Disabled"}
                </p>
              </div>
            </div>

            {data.passwordStatus.isLocked ? (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-destructive">
                Account locked until{" "}
                {formatWhen(data.passwordStatus.lockedUntil)}
              </p>
            ) : null}

            <form
              className="space-y-3 border-t border-border pt-4"
              onSubmit={form.handleSubmit(onChangePassword)}
            >
              <p className="flex items-center gap-2 font-medium">
                <KeyRound className="h-4 w-4" />
                Change password
              </p>
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  {...form.register("currentPassword")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  {...form.register("newPassword")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  {...form.register("confirmPassword")}
                />
              </div>
              {passwordError ? (
                <p className="text-sm text-destructive">{passwordError}</p>
              ) : null}
              {passwordMessage ? (
                <p className="text-sm text-emerald-600">{passwordMessage}</p>
              ) : null}
              <Button type="submit" disabled={changePasswordMutation.isPending}>
                Update password
              </Button>
            </form>
          </CardContent>
        </Card>

        <MfaEnrollmentCard />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Security score factors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.securityScore.factors.map((factor) => (
              <div
                key={factor.key}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="text-muted-foreground">{factor.label}</span>
                <span
                  className={cn(
                    "rounded-md px-2 py-0.5 text-xs font-medium",
                    factor.passed
                      ? "bg-emerald-500/15 text-emerald-600"
                      : "bg-amber-500/15 text-amber-700",
                  )}
                >
                  {factor.passed ? "Pass" : "Improve"} · {factor.weight}pts
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Active sessions / devices</CardTitle>
          </CardHeader>
          <CardContent>
            {sessionsQuery.isLoading ? (
              <LoadingState label="Loading sessions" className="border-0" />
            ) : sessionsQuery.isError ? (
              <ErrorState
                title="Sessions unavailable"
                description="Could not load active devices."
                onRetry={() => void sessionsQuery.refetch()}
              />
            ) : !sessionsQuery.data?.items.length ? (
              <EmptyState
                icon={MonitorSmartphone}
                title="No active sessions"
                description="Signed-in devices will appear here."
                className="min-h-[180px] border-0"
              />
            ) : (
              <ul className="space-y-3">
                {sessionsQuery.data.items.map((session) => (
                  <li
                    key={session.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-border/80 px-3 py-3"
                  >
                    <div className="min-w-0 space-y-1 text-sm">
                      <p className="truncate font-medium">
                        {session.deviceName}
                        {session.isCurrent ? (
                          <span className="ml-2 text-xs text-primary">
                            Current
                          </span>
                        ) : null}
                      </p>
                      <p className="truncate text-muted-foreground">
                        {session.ipAddress} · {formatWhen(session.lastActiveAt)}
                      </p>
                      {session.userEmail ? (
                        <p className="truncate text-xs text-muted-foreground">
                          {session.userEmail}
                        </p>
                      ) : null}
                    </div>
                    {!session.isCurrent ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        disabled={terminateMutation.isPending}
                        onClick={() =>
                          void terminateMutation.mutateAsync(session.id)
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={sessionPage <= 1}
                onClick={() => setSessionPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={
                  !sessionsQuery.data ||
                  sessionPage >= sessionsQuery.data.pagination.totalPages
                }
                onClick={() => setSessionPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent logins</CardTitle>
          </CardHeader>
          <CardContent>
            {loginQuery.isLoading ? (
              <LoadingState label="Loading logins" className="border-0" />
            ) : loginQuery.isError ? (
              <ErrorState
                title="Login history unavailable"
                description="Could not load recent logins."
                onRetry={() => void loginQuery.refetch()}
              />
            ) : !loginQuery.data?.items.length ? (
              <EmptyState
                icon={Shield}
                title="No login activity"
                description="Successful and failed sign-ins will show here."
                className="min-h-[180px] border-0"
              />
            ) : (
              <ul className="space-y-3">
                {loginQuery.data.items.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-lg border border-border/80 px-3 py-3 text-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-medium">{item.email}</p>
                      <span
                        className={cn(
                          "rounded-md px-2 py-0.5 text-xs",
                          item.success
                            ? "bg-emerald-500/15 text-emerald-600"
                            : "bg-destructive/15 text-destructive",
                        )}
                      >
                        {item.success ? "Success" : "Failed"}
                      </span>
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      {item.ipAddress} · {formatWhen(item.createdAt)}
                    </p>
                    {!item.success && item.failureReason ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.failureReason}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={loginPage <= 1}
                onClick={() => setLoginPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={
                  !loginQuery.data ||
                  loginPage >= loginQuery.data.pagination.totalPages
                }
                onClick={() => setLoginPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Security alerts</CardTitle>
        </CardHeader>
        <CardContent>
          {alertsQuery.isLoading ? (
            <LoadingState label="Loading alerts" className="border-0" />
          ) : alertsQuery.isError ? (
            <ErrorState
              title="Alerts unavailable"
              description="Could not load security alerts."
              onRetry={() => void alertsQuery.refetch()}
            />
          ) : !alertsQuery.data?.items.length ? (
            <EmptyState
              icon={ShieldCheck}
              title="No open alerts"
              description="Unresolved security events will appear here."
              className="min-h-[160px] border-0"
            />
          ) : (
            <ul className="space-y-3">
              {alertsQuery.data.items.map((alert) => (
                <li
                  key={alert.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border/80 px-3 py-3"
                >
                  <div className="min-w-0 space-y-1 text-sm">
                    <p className="font-medium">{alert.message}</p>
                    <p className="text-muted-foreground">
                      {alert.severity} · {alert.category} ·{" "}
                      {formatWhen(alert.createdAt)}
                    </p>
                  </div>
                  {canReadAudit ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={resolveMutation.isPending}
                      onClick={() => void resolveMutation.mutateAsync(alert.id)}
                    >
                      Resolve
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={alertPage <= 1}
              onClick={() => setAlertPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={
                !alertsQuery.data ||
                alertPage >= alertsQuery.data.pagination.totalPages
              }
              onClick={() => setAlertPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>

      {canReadAudit ? (
        <Card>
          <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">Audit timeline</CardTitle>
            <Input
              className="max-w-xs"
              placeholder="Search audit logs..."
              value={auditSearch}
              onChange={(event) => {
                setAuditSearch(event.target.value);
                setAuditPage(1);
              }}
            />
          </CardHeader>
          <CardContent>
            {auditQuery.isLoading ? (
              <LoadingState label="Loading audit logs" className="border-0" />
            ) : auditQuery.isError ? (
              <ErrorState
                title="Audit logs unavailable"
                description="You may need audit:read permission."
                onRetry={() => void auditQuery.refetch()}
              />
            ) : !auditQuery.data?.items.length ? (
              <EmptyState
                icon={Shield}
                title="No audit events"
                description="Security and compliance events will list here."
                className="min-h-[160px] border-0"
              />
            ) : (
              <ul className="space-y-3">
                {auditQuery.data.items.map((entry) => (
                  <li
                    key={entry.id}
                    className="rounded-lg border border-border/80 px-3 py-3 text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{entry.action}</p>
                      <span className="text-xs text-muted-foreground">
                        {formatWhen(entry.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      {entry.resource}
                      {entry.userEmail ? ` · ${entry.userEmail}` : ""}
                      {entry.ipAddress ? ` · ${entry.ipAddress}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={auditPage <= 1}
                onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={
                  !auditQuery.data ||
                  auditPage >= auditQuery.data.pagination.totalPages
                }
                onClick={() => setAuditPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
