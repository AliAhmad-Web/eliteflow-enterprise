"use client";

import type {
  Client,
  ClientPipelineBoardDto,
  ClientPipelineStageValue,
} from "@enterprise/shared";
import { Loader2 } from "lucide-react";
import { useState } from "react";

import { EmptyState } from "@/components/common/feedback/empty-state";
import { ErrorState } from "@/components/common/feedback/error-state";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApiClientError } from "@/services/api/api-error";

import { useUpdateClientPipelineStage } from "../hooks/use-client-mutations";
import { CLIENT_PIPELINE_STAGE_LABELS } from "../types/clients.types";
import { ClientStatusBadge } from "./client-status-badge";

interface ClientsPipelineBoardProps {
  board: ClientPipelineBoardDto | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  onView: (client: Client) => void;
  canWrite: boolean;
}

export function ClientsPipelineBoard({
  board,
  isLoading,
  isError,
  error,
  onRetry,
  onView,
  canWrite,
}: ClientsPipelineBoardProps) {
  const updateStage = useUpdateClientPipelineStage();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  if (isLoading && !board) {
    return <LoadingState label="Loading pipeline" className="border-0" />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Could not load pipeline"
        description={
          error instanceof Error ? error.message : "Please try again."
        }
        onRetry={onRetry}
      />
    );
  }

  if (!board || board.total === 0) {
    return (
      <EmptyState
        title="Pipeline is empty"
        description="Create clients to populate the sales pipeline board."
      />
    );
  }

  const moveClient = async (
    client: Client,
    pipelineStage: ClientPipelineStageValue,
  ) => {
    if (!canWrite || client.pipelineStage === pipelineStage) return;
    setActionError(null);
    setPendingId(client.id);
    try {
      await updateStage.mutateAsync({ id: client.id, pipelineStage });
    } catch (err) {
      setActionError(
        err instanceof ApiClientError || err instanceof Error
          ? err.message
          : "Could not update pipeline stage.",
      );
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <p>
          {board.total} client{board.total === 1 ? "" : "s"} across{" "}
          {board.columns.length} stages
        </p>
        {actionError ? (
          <p className="text-destructive" role="alert">
            {actionError}
          </p>
        ) : null}
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {board.columns.map((column) => (
          <section
            key={column.stage}
            className="flex w-72 shrink-0 flex-col rounded-xl border border-border/50 bg-muted/15"
            aria-label={`${CLIENT_PIPELINE_STAGE_LABELS[column.stage]} stage`}
          >
            <header className="flex items-center justify-between gap-2 border-b border-border/40 px-3 py-2.5">
              <h3 className="text-sm font-semibold text-foreground">
                {CLIENT_PIPELINE_STAGE_LABELS[column.stage]}
              </h3>
              <Badge variant="secondary">{column.count}</Badge>
            </header>

            <ul className="flex max-h-[28rem] flex-col gap-2 overflow-y-auto p-2">
              {column.clients.length === 0 ? (
                <li className="rounded-lg border border-dashed border-border/50 px-3 py-6 text-center text-xs text-muted-foreground">
                  No clients
                </li>
              ) : (
                column.clients.map((client) => {
                  const isPending = pendingId === client.id;
                  return (
                    <li
                      key={client.id}
                      className="rounded-lg border border-border/40 bg-background p-3 shadow-(--shadow-sm)"
                    >
                      <button
                        type="button"
                        className="w-full text-left"
                        onClick={() => onView(client)}
                      >
                        <p className="truncate text-sm font-medium text-foreground">
                          {client.companyName}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {client.contactName}
                        </p>
                      </button>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <ClientStatusBadge status={client.status} />
                        {isPending ? (
                          <Loader2
                            className="h-3.5 w-3.5 animate-spin text-muted-foreground"
                            aria-label="Updating stage"
                          />
                        ) : null}
                      </div>
                      {canWrite ? (
                        <div className="mt-2">
                          <label
                            htmlFor={`pipeline-move-${client.id}`}
                            className="sr-only"
                          >
                            Move {client.companyName} to stage
                          </label>
                          <select
                            id={`pipeline-move-${client.id}`}
                            className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
                            value={client.pipelineStage ?? column.stage}
                            disabled={isPending || updateStage.isPending}
                            onChange={(event) => {
                              void moveClient(
                                client,
                                event.target
                                  .value as ClientPipelineStageValue,
                              );
                            }}
                          >
                            {board.columns.map((option) => (
                              <option key={option.stage} value={option.stage}>
                                Move to{" "}
                                {CLIENT_PIPELINE_STAGE_LABELS[option.stage]}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="mt-2 h-8 w-full"
                          onClick={() => onView(client)}
                        >
                          View
                        </Button>
                      )}
                    </li>
                  );
                })
              )}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
