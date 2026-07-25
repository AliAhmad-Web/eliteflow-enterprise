"use client";

import type { IntegrationDetailDto } from "@enterprise/shared";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  formatIntegrationWhen,
  getIntegrationLogo,
  healthBadgeVariant,
  statusBadgeVariant,
} from "../lib/integration-ui";

export function IntegrationDetailPanel({
  detail,
  canManage,
}: {
  detail: IntegrationDetailDto;
  canManage: boolean;
}) {
  const logo = getIntegrationLogo(detail);
  const LogoIcon = logo.icon;

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-start gap-3">
          <div
            className={`icon-box icon-box-md rounded-lg ${logo.accent}`}
          >
            <LogoIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-base">{detail.name}</CardTitle>
            <p className="text-sm text-muted-foreground">{detail.description}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={statusBadgeVariant(detail.status)}>
            {detail.status.replaceAll("_", " ")}
          </Badge>
          <Badge variant={healthBadgeVariant(detail.healthStatus)}>
            {detail.healthStatus}
          </Badge>
          {detail.hasCredentials ? (
            <Badge variant="success">Credentials secured</Badge>
          ) : (
            <Badge variant="outline">No credentials</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <p className="text-muted-foreground">Provider</p>
            <p className="font-medium">{detail.provider}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Slug</p>
            <p className="font-medium">{detail.slug}</p>
          </div>
          <div>
            <p className="text-muted-foreground">API Version</p>
            <p className="font-medium">{detail.apiVersion ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Success Rate</p>
            <p className="font-medium">
              {detail.successRate == null ? "—" : `${detail.successRate}%`}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Account</p>
            <p className="font-medium">{detail.accountLabel ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Token Expires</p>
            <p className="font-medium">
              {formatIntegrationWhen(detail.tokenExpiresAt)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Connected</p>
            <p className="font-medium">
              {formatIntegrationWhen(detail.connectedAt)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Last Sync</p>
            <p className="font-medium">
              {formatIntegrationWhen(detail.lastSyncAt)}
            </p>
          </div>
        </div>

        {detail.lastError ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            Last error: {detail.lastError}
          </p>
        ) : null}

        {detail.healthMessage ? (
          <p className="rounded-md border border-border/50 bg-muted/30 px-3 py-2 text-sm">
            {detail.healthMessage}
          </p>
        ) : null}

        {!canManage ? (
          <p className="text-xs text-muted-foreground">
            Connection management is limited to Admin and Super Admin.
          </p>
        ) : null}

        <div className="space-y-2">
          <p className="text-sm font-medium">Webhooks</p>
          {detail.webhooks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No webhook endpoints registered.
            </p>
          ) : (
            detail.webhooks.map((webhook) => (
              <div
                key={webhook.id}
                className="rounded-md border border-border/50 px-3 py-2 text-sm"
              >
                <p className="truncate font-medium">{webhook.url}</p>
                <p className="text-xs text-muted-foreground">
                  {webhook.isActive ? "Active" : "Inactive"} ·{" "}
                  {webhook.hasSecret ? "Secret encrypted" : "No secret"} ·{" "}
                  Events: {webhook.events.join(", ") || "—"}
                </p>
              </div>
            ))
          )}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Recent Logs</p>
          {detail.recentLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            detail.recentLogs.map((log) => (
              <div
                key={log.id}
                className="border-b border-border/40 pb-2 text-sm last:border-0"
              >
                <div className="flex items-center justify-between gap-2">
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
                  <span className="text-xs text-muted-foreground">
                    {formatIntegrationWhen(log.createdAt)}
                  </span>
                </div>
                <p className="mt-1 font-medium">{log.action}</p>
                <p className="text-muted-foreground">{log.message}</p>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
