"use client";

import { MonitorSmartphone, RefreshCw, ShieldOff } from "lucide-react";

import { EmptyState } from "@/components/common/feedback/empty-state";
import { ErrorState } from "@/components/common/feedback/error-state";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";

import { SessionCard } from "./session-card";
import { useRevokeOtherSessions } from "../hooks/use-revoke-other-sessions";
import { useSessions } from "../hooks/use-sessions";

export function ActiveSessionsPanel() {
  const { data: sessions, isLoading, isError, error, refetch, isFetching } =
    useSessions();
  const revokeOthers = useRevokeOtherSessions();

  const otherCount =
    sessions?.filter((session) => !session.isCurrent).length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Active Sessions"
        description="Review devices signed into your account. Sign out anything you do not recognize."
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => void refetch()}
          disabled={isFetching}
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          Refresh
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => void revokeOthers.mutateAsync()}
          disabled={revokeOthers.isPending || otherCount === 0}
        >
          <ShieldOff className="h-3.5 w-3.5" aria-hidden="true" />
          {revokeOthers.isPending
            ? "Signing out…"
            : "Log out all other devices"}
        </Button>
      </div>

      {revokeOthers.isError ? (
        <p className="text-sm text-destructive" role="alert">
          {revokeOthers.error instanceof Error
            ? revokeOthers.error.message
            : "Could not sign out other devices"}
        </p>
      ) : null}

      {revokeOthers.isSuccess ? (
        <p className="text-sm text-success" role="status">
          {revokeOthers.data.message}
          {typeof revokeOthers.data.revokedCount === "number"
            ? ` (${revokeOthers.data.revokedCount})`
            : null}
        </p>
      ) : null}

      {isLoading ? <LoadingState label="Loading sessions" /> : null}

      {isError ? (
        <ErrorState
          title="Could not load sessions"
          description={
            error instanceof Error
              ? error.message
              : "Please try again in a moment."
          }
          onRetry={() => void refetch()}
        />
      ) : null}

      {!isLoading && !isError && sessions && sessions.length === 0 ? (
        <EmptyState
          icon={MonitorSmartphone}
          title="No active sessions"
          description="There are no active device sessions for this account."
          actionLabel="Refresh"
          onAction={() => void refetch()}
        />
      ) : null}

      {!isLoading && !isError && sessions && sessions.length > 0 ? (
        <div className="grid gap-4">
          {sessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
