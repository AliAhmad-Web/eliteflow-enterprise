"use client";

import { useState } from "react";
import type { Session } from "@enterprise/shared";
import {
  Laptop,
  LogOut,
  MapPin,
  MonitorSmartphone,
  Pencil,
  Smartphone,
  Tablet,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import { useRenameSession } from "../hooks/use-rename-session";
import { useRevokeSession } from "../hooks/use-revoke-session";

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function DeviceIcon({ deviceType }: { deviceType: string }) {
  switch (deviceType) {
    case "mobile":
      return <Smartphone className="h-5 w-5" aria-hidden="true" />;
    case "tablet":
      return <Tablet className="h-5 w-5" aria-hidden="true" />;
    case "desktop":
      return <Laptop className="h-5 w-5" aria-hidden="true" />;
    case "smarttv":
    case "wearable":
    case "console":
    case "unknown":
      return <MonitorSmartphone className="h-5 w-5" aria-hidden="true" />;
    default:
      return <MonitorSmartphone className="h-5 w-5" aria-hidden="true" />;
  }
}

interface SessionCardProps {
  session: Session;
}

export function SessionCard({ session }: SessionCardProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [deviceName, setDeviceName] = useState(session.deviceName);
  const revokeSession = useRevokeSession();
  const renameSession = useRenameSession();

  const locationLabel = session.country
    ? `${session.ipAddress} · ${session.country}`
    : session.ipAddress;

  const handleRename = async () => {
    const nextName = deviceName.trim();
    if (!nextName || nextName === session.deviceName) {
      setIsRenaming(false);
      setDeviceName(session.deviceName);
      return;
    }

    await renameSession.mutateAsync({
      sessionId: session.id,
      deviceName: nextName,
    });
    setIsRenaming(false);
  };

  return (
    <Card
      className={cn(
        "overflow-hidden",
        session.isCurrent && "border-primary/40 bg-primary/[0.03]",
      )}
    >
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <DeviceIcon deviceType={session.deviceType} />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="truncate">{session.deviceName}</CardTitle>
              {session.isCurrent ? (
                <Badge variant="success">Current session</Badge>
              ) : null}
            </div>
            <CardDescription>
              {session.browser} · {session.os}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 text-sm">
        <div className="flex items-start gap-2 text-muted-foreground">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{locationLabel || "Unknown location"}</span>
        </div>
        <div className="grid gap-1 text-muted-foreground sm:grid-cols-2">
          <p>
            <span className="text-foreground/80">Signed in:</span>{" "}
            {new Date(session.createdAt).toLocaleString()}
          </p>
          <p>
            <span className="text-foreground/80">Last active:</span>{" "}
            {formatRelativeTime(session.lastActiveAt)}
          </p>
        </div>

        {isRenaming ? (
          <div className="space-y-2 rounded-lg border border-border bg-background p-3">
            <Label htmlFor={`rename-${session.id}`}>Device name</Label>
            <Input
              id={`rename-${session.id}`}
              value={deviceName}
              onChange={(event) => setDeviceName(event.target.value)}
              maxLength={200}
              autoFocus
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => void handleRename()}
                disabled={renameSession.isPending}
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsRenaming(false);
                  setDeviceName(session.deviceName);
                }}
                disabled={renameSession.isPending}
              >
                Cancel
              </Button>
            </div>
            {renameSession.isError ? (
              <p className="text-sm text-destructive">
                {renameSession.error instanceof Error
                  ? renameSession.error.message
                  : "Could not rename device"}
              </p>
            ) : null}
          </div>
        ) : null}
      </CardContent>

      <CardFooter className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsRenaming(true)}
          disabled={isRenaming || renameSession.isPending}
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          Rename device
        </Button>
        {!session.isCurrent ? (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => void revokeSession.mutateAsync(session.id)}
            disabled={revokeSession.isPending}
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            {revokeSession.isPending ? "Signing out…" : "Log out"}
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">
            Use Sign out in the account menu to end this session.
          </p>
        )}
        {revokeSession.isError ? (
          <p className="w-full text-sm text-destructive">
            {revokeSession.error instanceof Error
              ? revokeSession.error.message
              : "Could not revoke session"}
          </p>
        ) : null}
      </CardFooter>
    </Card>
  );
}
