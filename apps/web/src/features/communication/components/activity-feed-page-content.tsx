"use client";

import type { ActivityEntityTypeValue } from "@enterprise/shared";
import {
  ACTIVITY_ENTITY_TYPES,
  PERMISSIONS,
} from "@enterprise/shared";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Bell,
  Bot,
  Building2,
  CalendarDays,
  CheckSquare,
  CircleDot,
  ExternalLink,
  FileText,
  FolderKanban,
  Megaphone,
  MessageSquare,
  MessagesSquare,
  Receipt,
  RefreshCw,
  Search,
  Settings2,
  Users,
  UserRound,
  Video,
} from "lucide-react";
import { useEffect, useState } from "react";

import { EmptyState } from "@/components/common/feedback/empty-state";
import { ErrorState } from "@/components/common/feedback/error-state";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useHasPermission } from "@/features/rbac/hooks/use-permissions";
import { cn } from "@/lib/utils";

import { useActivitiesInfinite } from "../hooks/use-communication";
import { useSyncActivities } from "../hooks/use-communication-mutations";
import {
  ACTIVITY_ENTITY_TYPE_LABELS,
  formatRelativeTime,
} from "../types/communication.types";
import { ActivityFeedSkeleton } from "./communication-skeletons";

export function ActivityFeedPageContent() {
  const canRead = useHasPermission(PERMISSIONS.CHAT_READ);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [entityType, setEntityType] = useState<ActivityEntityTypeValue | "ALL">(
    "ALL",
  );

  const syncMut = useSyncActivities();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useActivitiesInfinite(
    {
      pageSize: 30,
      search: debouncedSearch || undefined,
      entityType: entityType === "ALL" ? undefined : entityType,
    },
    canRead,
  );

  const activities = (data?.pages ?? []).flatMap((p) => p.items);
  const showInitialLoading = isLoading && !data;

  if (!canRead) {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState
          title="Access denied"
          description="You do not have permission to view the activity feed."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-1 pb-8 sm:gap-6">
      <PageHeader
        title="Activity Feed"
        description="Track events and changes across your workspace in one timeline."
      />

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card/40 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="relative w-full max-w-md flex-1">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search activities…"
            className="h-10 pl-9"
            aria-label="Search activities"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="activity-entity-filter">
            Filter by type
          </label>
          <select
            id="activity-entity-filter"
            value={entityType}
            onChange={(e) =>
              setEntityType(e.target.value as ActivityEntityTypeValue | "ALL")
            }
            className="h-10 min-w-[9rem] rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-xs focus-visible:outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <option value="ALL">All types</option>
            {ACTIVITY_ENTITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {ACTIVITY_ENTITY_TYPE_LABELS[t]}
              </option>
            ))}
          </select>

          <Button
            variant="outline"
            size="sm"
            className="h-10"
            onClick={() => void syncMut.mutate()}
            disabled={syncMut.isPending}
          >
            <RefreshCw
              className={cn(
                "mr-1.5 h-4 w-4",
                syncMut.isPending && "animate-spin",
              )}
            />
            Sync
          </Button>
        </div>
      </div>

      {isError ? (
        <ErrorState
          title="Failed to load activities"
          description="Please try again in a moment."
          onRetry={() => void refetch()}
        />
      ) : null}

      {showInitialLoading ? <ActivityFeedSkeleton /> : null}

      {!showInitialLoading && !isError && activities.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No activities yet"
          description="Events from projects, tasks, invoices, files, and chat will appear here."
        />
      ) : null}

      {!showInitialLoading && activities.length > 0 ? (
        <div className="relative">
          <div
            className="absolute bottom-0 left-[19px] top-0 w-px bg-border"
            aria-hidden
          />

          <ul className="space-y-0">
            {activities.map((act) => (
              <li key={act.id} className="relative flex gap-3 sm:gap-4">
                <div className="relative z-10 mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-card shadow-sm">
                  {(() => {
                    const Icon = getEntityIcon(act.entityType);
                    return (
                      <Icon
                        className="h-4 w-4 text-muted-foreground"
                        aria-hidden
                      />
                    );
                  })()}
                </div>

                <article className="mb-2.5 flex-1 rounded-xl border border-border bg-card px-3.5 py-3 transition-shadow hover:shadow-sm sm:px-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold leading-5 text-foreground">
                        {act.title}
                      </h3>
                      {act.body ? (
                        <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">
                          {act.body}
                        </p>
                      ) : null}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className="h-5 text-[10px] font-medium"
                        >
                          {ACTIVITY_ENTITY_TYPE_LABELS[act.entityType]}
                        </Badge>
                        {act.actor ? (
                          <span className="text-xs text-muted-foreground">
                            by {act.actor.firstName} {act.actor.lastName}
                          </span>
                        ) : null}
                        <time
                          className="text-xs text-muted-foreground"
                          dateTime={act.createdAt}
                        >
                          {formatRelativeTime(act.createdAt)}
                        </time>
                      </div>
                    </div>
                    {act.linkUrl ? (
                      <a
                        href={act.linkUrl}
                        className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring/50"
                        title="Open related record"
                        aria-label={`Open related ${ACTIVITY_ENTITY_TYPE_LABELS[act.entityType]}`}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    ) : null}
                  </div>
                </article>
              </li>
            ))}
          </ul>

          {hasNextPage ? (
            <div className="mt-5 flex justify-center">
              <Button
                variant="outline"
                onClick={() => void fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? "Loading…" : "Load more"}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function getEntityIcon(type: ActivityEntityTypeValue): LucideIcon {
  switch (type) {
    case "CLIENT":
      return Building2;
    case "PROJECT":
      return FolderKanban;
    case "TASK":
      return CheckSquare;
    case "INVOICE":
      return Receipt;
    case "CALENDAR":
      return CalendarDays;
    case "FILE":
      return FileText;
    case "AI":
      return Bot;
    case "NOTIFICATION":
      return Bell;
    case "TEAM":
      return Users;
    case "MESSAGE":
    case "COMMENT":
    case "CONVERSATION":
      return MessageSquare;
    case "USER":
      return UserRound;
    case "SYSTEM":
      return Settings2;
    case "ANNOUNCEMENT":
      return Megaphone;
    case "MEETING":
      return Video;
    case "THREAD":
      return MessagesSquare;
    default: {
      const _exhaustive: never = type;
      void _exhaustive;
      return CircleDot;
    }
  }
}
