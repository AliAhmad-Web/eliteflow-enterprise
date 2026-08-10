"use client";

import {
  CLIENT_ACTIVITY_TYPES,
  PERMISSIONS,
  type ClientActivityTypeValue,
} from "@enterprise/shared";
import { Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/common/feedback/empty-state";
import { ErrorState } from "@/components/common/feedback/error-state";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PermissionGuard } from "@/features/rbac/components/permission-guards";
import { FORM_SELECT_CLASS } from "@/lib/form-styles";
import { cn } from "@/lib/utils";
import { ApiClientError } from "@/services/api/api-error";

import {
  useCreateClientActivity,
  useDeleteClientActivity,
} from "../hooks/use-client-mutations";
import { useClientActivities } from "../hooks/use-clients";
import {
  CLIENT_ACTIVITY_TYPE_LABELS,
} from "../types/clients.types";

interface ClientActivitiesPanelProps {
  clientId: string;
  canWrite: boolean;
}

export function ClientActivitiesPanel({
  clientId,
  canWrite,
}: ClientActivitiesPanelProps) {
  const query = useMemo(
    () => ({ page: 1, limit: 20 }) as const,
    [],
  );
  const activitiesQuery = useClientActivities(clientId, query);
  const createMutation = useCreateClientActivity(clientId);
  const deleteMutation = useDeleteClientActivity(clientId);

  const [type, setType] = useState<ClientActivityTypeValue>("NOTE");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [message, setMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  const activities = activitiesQuery.data?.items ?? [];

  const handleCreate = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setMessage({ tone: "error", text: "Title is required." });
      return;
    }

    setMessage(null);
    try {
      await createMutation.mutateAsync({
        type,
        title: trimmedTitle,
        body: body.trim() || undefined,
      });
      setTitle("");
      setBody("");
      setType("NOTE");
      setMessage({ tone: "success", text: "Activity logged." });
    } catch (err) {
      setMessage({
        tone: "error",
        text:
          err instanceof ApiClientError || err instanceof Error
            ? err.message
            : "Could not create activity.",
      });
    }
  };

  const handleDelete = async (activityId: string) => {
    setMessage(null);
    try {
      await deleteMutation.mutateAsync(activityId);
      setMessage({ tone: "success", text: "Activity removed." });
    } catch (err) {
      setMessage({
        tone: "error",
        text:
          err instanceof ApiClientError || err instanceof Error
            ? err.message
            : "Could not delete activity.",
      });
    }
  };

  return (
    <section className="space-y-4 rounded-xl border border-border/50 p-4">
      <div>
        <h4 className="text-sm font-semibold text-foreground">Activities</h4>
        <p className="text-xs text-muted-foreground">
          Notes, calls, emails, and meetings for this client.
        </p>
      </div>

      {message ? (
        <p
          className={
            message.tone === "success"
              ? "rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400"
              : "rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          }
          role="status"
        >
          {message.text}
        </p>
      ) : null}

      <PermissionGuard permission={PERMISSIONS.CLIENTS_WRITE}>
        {canWrite ? (
          <div className="space-y-3 rounded-lg border border-border/40 bg-muted/15 p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="activity-type">Type</Label>
                <select
                  id="activity-type"
                  className={FORM_SELECT_CLASS}
                  value={type}
                  onChange={(event) =>
                    setType(event.target.value as ClientActivityTypeValue)
                  }
                >
                  {CLIENT_ACTIVITY_TYPES.filter(
                    (value) => value !== "STATUS_CHANGE",
                  ).map((value) => (
                    <option key={value} value={value}>
                      {CLIENT_ACTIVITY_TYPE_LABELS[value]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="activity-title" required>
                  Title
                </Label>
                <Input
                  id="activity-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={200}
                  placeholder="Follow-up call"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="activity-body">Details</Label>
              <Textarea
                id="activity-body"
                rows={3}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                maxLength={5000}
                placeholder="Optional notes…"
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                disabled={createMutation.isPending}
                isLoading={createMutation.isPending}
                onClick={() => void handleCreate()}
              >
                Log activity
              </Button>
            </div>
          </div>
        ) : null}
      </PermissionGuard>

      {activitiesQuery.isLoading ? (
        <LoadingState
          label="Loading activities"
          className="min-h-[80px] border-0 bg-transparent"
        />
      ) : null}

      {activitiesQuery.isError ? (
        <ErrorState
          title="Could not load activities"
          description={
            activitiesQuery.error instanceof Error
              ? activitiesQuery.error.message
              : "Please try again."
          }
          onRetry={() => void activitiesQuery.refetch()}
          className="min-h-[100px]"
        />
      ) : null}

      {!activitiesQuery.isLoading &&
      !activitiesQuery.isError &&
      activities.length === 0 ? (
        <EmptyState
          title="No activities yet"
          description="Log a note or call to start the CRM timeline."
        />
      ) : null}

      {activities.length > 0 ? (
        <ul className="space-y-2">
          {activities.map((activity) => (
            <li
              key={activity.id}
              className="rounded-lg border border-border/40 px-3 py-2.5"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {activity.title}
                    </p>
                    <Badge variant="secondary">
                      {CLIENT_ACTIVITY_TYPE_LABELS[activity.type]}
                    </Badge>
                  </div>
                  {activity.body ? (
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {activity.body}
                    </p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    {new Date(activity.occurredAt).toLocaleString()}
                    {activity.createdByName
                      ? ` · ${activity.createdByName}`
                      : ""}
                  </p>
                </div>
                {canWrite && activity.type !== "STATUS_CHANGE" ? (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    className={cn("text-muted-foreground hover:text-destructive")}
                    aria-label={`Delete activity ${activity.title}`}
                    disabled={deleteMutation.isPending}
                    onClick={() => void handleDelete(activity.id)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
