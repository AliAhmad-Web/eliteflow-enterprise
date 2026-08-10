"use client";

import {
  MEETING_STATUSES,
  PERMISSIONS,
  type MeetingRoomDto,
  type MeetingStatusValue,
} from "@enterprise/shared";
import { Bot, Search, Users, Video } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";

import { EmptyState } from "@/components/common/feedback/empty-state";
import { ErrorState } from "@/components/common/feedback/error-state";
import { SoftContentSkeleton } from "@/components/common/feedback/soft-content-skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useHasPermission } from "@/features/rbac/hooks/use-permissions";
import { cn } from "@/lib/utils";
import { ApiClientError } from "@/services/api/api-error";

import {
  useCommunicationHubAi,
  useCreateMeeting,
  useMeetings,
} from "../hooks/use-communication-hub";
import { formatRelativeTime } from "../types/communication.types";

const selectClassName =
  "flex h-10 w-full rounded-lg border border-input bg-background/80 px-3 py-2 text-sm text-foreground shadow-[var(--shadow-xs)] transition-all focus-visible:outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring/50 sm:w-[160px]";

function statusBadgeClass(status: MeetingStatusValue): string {
  switch (status) {
    case "SCHEDULED":
      return "border-border text-foreground";
    case "WAITING":
      return "border-amber-500/40 text-amber-700 dark:text-amber-400";
    case "LIVE":
      return "border-emerald-500/40 text-emerald-700 dark:text-emerald-400";
    case "ENDED":
      return "border-border text-muted-foreground";
    case "CANCELLED":
      return "border-destructive/40 text-destructive";
    default: {
      const _exhaustive: never = status;
      void _exhaustive;
      return "border-border";
    }
  }
}

function formatError(err: unknown, fallback: string): string {
  if (err instanceof ApiClientError) {
    if (err.errors.length > 0) {
      return err.errors.map((item) => item.message).join(" · ");
    }
    if (err.message && err.message !== "Validation failed") {
      return err.message;
    }
    return "Check the form fields and try again.";
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function MeetingsPageContent() {
  const canRead = useHasPermission(PERMISSIONS.COMMUNICATION_READ);
  const canReadChat = useHasPermission(PERMISSIONS.CHAT_READ);
  const canManage = useHasPermission(PERMISSIONS.MEETING_MANAGE);
  const canUseAi = useHasPermission(PERMISSIONS.AI_USE);
  const allowed = canRead || canReadChat;

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [status, setStatus] = useState<MeetingStatusValue | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [aiSummary, setAiSummary] = useState<{
    meetingId: string;
    content: string;
  } | null>(null);

  const query = useMemo(
    () => ({
      page,
      pageSize: 30,
      search: deferredSearch.trim() || undefined,
      status: status === "ALL" ? undefined : status,
    }),
    [page, deferredSearch, status],
  );

  const listQuery = useMeetings(query, allowed);
  const showInitialLoading = listQuery.isLoading && !listQuery.data;
  const aiMut = useCommunicationHubAi();
  const items = listQuery.data?.items ?? [];
  const pagination = listQuery.data?.pagination;
  const totalPages = pagination?.totalPages ?? 1;

  const handleAiSummary = async (meeting: MeetingRoomDto) => {
    try {
      const result = await aiMut.mutateAsync({
        action: "MEETING_SUMMARY",
        meetingId: meeting.id,
      });
      setAiSummary({ meetingId: meeting.id, content: result.content });
    } catch {
      setAiSummary({
        meetingId: meeting.id,
        content: "Unable to generate a meeting summary right now.",
      });
    }
  };

  if (!allowed) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Meetings"
          description="Schedule and manage meeting rooms."
        />
        <ErrorState
          title="Permission denied"
          description="You do not have access to meetings."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-1 pb-8 sm:gap-6">
      <PageHeader
        title="Meetings"
        description="Schedule meeting rooms and participants. Live A/V (WebRTC) is not enabled — rooms are scheduling/metadata only."
        actionLabel={canManage ? "Schedule meeting" : undefined}
        onAction={canManage ? () => setCreateOpen(true) : undefined}
      />

      <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
        Architecture ready — WebRTC coming later. Waiting room and participant
        flows are available for scheduling.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-md flex-1">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search meetings…"
            className="h-10 pl-9"
            aria-label="Search meetings"
          />
        </div>

        <label className="sr-only" htmlFor="meeting-status-filter">
          Filter by status
        </label>
        <select
          id="meeting-status-filter"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as MeetingStatusValue | "ALL");
            setPage(1);
          }}
          className={selectClassName}
        >
          <option value="ALL">All statuses</option>
          {MEETING_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </div>

      {listQuery.isError ? (
        <ErrorState
          title="Failed to load meetings"
          description="Please try again in a moment."
          onRetry={() => void listQuery.refetch()}
        />
      ) : null}

      {showInitialLoading ? <SoftContentSkeleton rows={6} /> : null}

      {!showInitialLoading && !listQuery.isError && items.length === 0 ? (
        <EmptyState
          icon={Video}
          title="No meetings scheduled"
          description="Schedule a meeting room to invite participants."
        />
      ) : null}

      {!showInitialLoading && items.length > 0 ? (
        <div className="rounded-xl border border-border bg-card/40">
          <ul className="divide-y divide-border">
            {items.map((meeting) => (
              <li
                key={meeting.id}
                className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">
                      {meeting.title}
                    </h3>
                    <Badge
                      variant="outline"
                      className={cn(
                        "h-5 text-[10px] font-medium",
                        statusBadgeClass(meeting.status),
                      )}
                    >
                      {meeting.status}
                    </Badge>
                    {meeting.waitingRoomEnabled ? (
                      <Badge variant="secondary" className="h-5 text-[10px]">
                        Waiting room
                      </Badge>
                    ) : null}
                  </div>
                  {meeting.description ? (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {meeting.description}
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <time dateTime={meeting.scheduledStart}>
                      Starts{" "}
                      {new Date(meeting.scheduledStart).toLocaleString()}
                    </time>
                    {meeting.scheduledEnd ? (
                      <time dateTime={meeting.scheduledEnd}>
                        Ends {new Date(meeting.scheduledEnd).toLocaleString()}
                      </time>
                    ) : null}
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" aria-hidden />
                      {meeting.participantCount ??
                        meeting.participants?.length ??
                        0}{" "}
                      participants
                    </span>
                    {meeting.host ? (
                      <span>
                        Host {meeting.host.firstName} {meeting.host.lastName}
                      </span>
                    ) : null}
                    <span>
                      Updated {formatRelativeTime(meeting.updatedAt)}
                    </span>
                  </div>

                  {aiSummary?.meetingId === meeting.id ? (
                    <p className="mt-3 whitespace-pre-wrap rounded-md border border-border bg-background/70 px-3 py-2 text-sm text-foreground">
                      {aiSummary.content}
                    </p>
                  ) : null}
                </div>

                {canUseAi ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    disabled={
                      aiMut.isPending && aiMut.variables?.meetingId === meeting.id
                    }
                    onClick={() => void handleAiSummary(meeting)}
                  >
                    <Bot className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                    {aiMut.isPending &&
                    aiMut.variables?.meetingId === meeting.id
                      ? "Summarizing…"
                      : "AI summary"}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>

          {totalPages > 1 ? (
            <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Page {pagination?.page ?? page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {canManage ? (
        <ScheduleMeetingDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
        />
      ) : null}
    </div>
  );
}

function ScheduleMeetingDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createMut = useCreateMeeting();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledStart, setScheduledStart] = useState(() =>
    toLocalInputValue(new Date(Date.now() + 60 * 60 * 1000).toISOString()),
  );
  const [scheduledEnd, setScheduledEnd] = useState("");
  const [waitingRoomEnabled, setWaitingRoomEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setTitle("");
    setDescription("");
    setScheduledStart(
      toLocalInputValue(new Date(Date.now() + 60 * 60 * 1000).toISOString()),
    );
    setScheduledEnd("");
    setWaitingRoomEnabled(true);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await createMut.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        scheduledStart: new Date(scheduledStart).toISOString(),
        scheduledEnd: scheduledEnd
          ? new Date(scheduledEnd).toISOString()
          : undefined,
        waitingRoomEnabled,
      });
      reset();
      onOpenChange(false);
    } catch (err) {
      setError(formatError(err, "Failed to schedule meeting."));
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Schedule meeting</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          <div className="space-y-2">
            <Label htmlFor="meeting-title" required>
              Title
            </Label>
            <Input
              id="meeting-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={300}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="meeting-description">Description</Label>
            <Textarea
              id="meeting-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="resize-y"
              maxLength={2000}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="meeting-start" required>
                Start
              </Label>
              <Input
                id="meeting-start"
                type="datetime-local"
                value={scheduledStart}
                onChange={(e) => setScheduledStart(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meeting-end">End (optional)</Label>
              <Input
                id="meeting-end"
                type="datetime-local"
                value={scheduledEnd}
                onChange={(e) => setScheduledEnd(e.target.value)}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={waitingRoomEnabled}
              onChange={(e) => setWaitingRoomEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            Enable waiting room
          </label>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMut.isPending}>
              {createMut.isPending ? "Scheduling…" : "Schedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
