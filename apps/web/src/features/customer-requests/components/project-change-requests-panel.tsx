"use client";

import type { CustomerRequestDto, Project } from "@enterprise/shared";
import {
  PERMISSIONS,
  UserRole,
  isCustomerRequestContinuationType,
} from "@enterprise/shared";
import { Plus } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  continuationRequestNewPath,
  requestDetailPath,
} from "@/constants/routes";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useHasPermission } from "@/features/rbac/hooks/use-permissions";

import { useCustomerRequests } from "../hooks/use-customer-requests";
import {
  CUSTOMER_REQUEST_TYPE_LABELS,
  continuationOrdinalLabel,
} from "../types/query-keys";
import { CustomerRequestStatusBadge } from "./customer-request-status-badge";

function reopenEligible(status: Project["status"]) {
  return status === "COMPLETED" || status === "CANCELLED" || status === "ON_HOLD";
}

export function ProjectChangeRequestsPanel({ project }: { project: Project }) {
  const { user } = useAuth();
  const isClient = user?.role.code === UserRole.CLIENT;
  const canCreate = useHasPermission(PERMISSIONS.CUSTOMER_REQUESTS_CREATE);

  const requestsQuery = useCustomerRequests({
    search: "",
    relatedProjectId: project.id,
    sortBy: "createdAt",
    sortOrder: "desc",
    page: 1,
    limit: 50,
  });

  const items = requestsQuery.data?.items ?? [];
  const continuations = items.filter((item) =>
    isCustomerRequestContinuationType(item.type),
  );
  const original = items.find(
    (item) => item.convertedProjectId === project.id && !item.isContinuation,
  );

  return (
    <section className="space-y-3 rounded-xl border border-border/50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-foreground">
            Requests / changes
          </h4>
          <p className="mt-1 text-xs text-muted-foreground">
            Request a revision, extra scope, next phase, maintenance, or reopen
            for this project.
          </p>
        </div>
        {isClient && canCreate ? (
          <div className="flex flex-wrap gap-2">
            {reopenEligible(project.status) ? (
              <Button asChild size="sm" variant="outline">
                <Link
                  href={continuationRequestNewPath(
                    project.id,
                    "REOPEN_PROJECT",
                  )}
                >
                  Reopen project
                </Link>
              </Button>
            ) : null}
            <Button asChild size="sm">
              <Link href={continuationRequestNewPath(project.id, "REVISION")}>
                <Plus className="mr-1.5 size-3.5" aria-hidden />
                Request change
              </Link>
            </Button>
          </div>
        ) : null}
      </div>

      {original ? (
        <p className="text-xs text-muted-foreground">
          Original request:{" "}
          <Link
            href={requestDetailPath(original.id)}
            className="font-medium text-foreground hover:underline"
          >
            {original.title}
          </Link>
        </p>
      ) : null}

      {requestsQuery.isLoading ? (
        <p className="text-xs text-muted-foreground">Loading requests…</p>
      ) : continuations.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No change requests yet for this project.
        </p>
      ) : (
        <ul className="space-y-2">
          {continuations.map((item) => (
            <ChangeRequestRow
              key={item.id}
              item={item}
              items={continuations}
            />
          ))}
        </ul>
      )}

      <ProjectRequestTimeline
        project={project}
        original={original}
        continuations={continuations}
      />
    </section>
  );
}

function ChangeRequestRow({
  item,
  items,
}: {
  item: CustomerRequestDto;
  items: CustomerRequestDto[];
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/50 px-3 py-2">
      <Link
        href={requestDetailPath(item.id)}
        className="min-w-0 text-sm font-medium text-foreground hover:underline"
      >
        {continuationOrdinalLabel(items, item)}
        <span className="mt-0.5 block truncate text-xs font-normal text-muted-foreground">
          {item.title}
        </span>
      </Link>
      <CustomerRequestStatusBadge status={item.status} />
    </li>
  );
}

function ProjectRequestTimeline({
  project,
  original,
  continuations,
}: {
  project: Project;
  original: CustomerRequestDto | undefined;
  continuations: CustomerRequestDto[];
}) {
  const events = buildTimeline(project, original, continuations);
  if (events.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 pt-2">
      <h5 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Project history
      </h5>
      <ol className="relative space-y-3 border-l border-border/70 pl-4">
        {events.map((event) => (
          <li key={event.id} className="relative">
            <span className="absolute -left-[1.3rem] top-1.5 h-2.5 w-2.5 rounded-full bg-primary/80" />
            <p className="text-sm font-medium text-foreground">{event.label}</p>
            <p className="text-xs text-muted-foreground">{event.at}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function buildTimeline(
  project: Project,
  original: CustomerRequestDto | undefined,
  continuations: CustomerRequestDto[],
) {
  const events: { id: string; at: string; sort: number; label: string }[] = [];

  const push = (id: string, iso: string | null | undefined, label: string) => {
    if (!iso) return;
    const sort = Date.parse(iso);
    if (Number.isNaN(sort)) return;
    events.push({
      id,
      at: new Date(iso).toLocaleString(),
      sort,
      label,
    });
  };

  push("project-created", project.createdAt, "Project created");
  if (original) {
    push(`${original.id}-submitted`, original.submittedAt, "Project requested");
    if (original.status === "APPROVED" || original.status === "CONVERTED") {
      push(
        `${original.id}-approved`,
        original.reviewedAt,
        "Project approved",
      );
    }
  }

  if (project.status === "IN_PROGRESS" || project.status === "COMPLETED") {
    push("project-started", project.startDate, "Project started");
  }

  for (const item of continuations) {
    const typeLabel = CUSTOMER_REQUEST_TYPE_LABELS[item.type];
    push(`${item.id}-submitted`, item.submittedAt, `${typeLabel} requested`);
    for (const entry of item.clarificationHistory ?? []) {
      push(
        `${item.id}-clarify-${entry.at}`,
        entry.at,
        entry.from === "admin" ? "Clarification" : "Customer response",
      );
    }
    if (item.status === "APPROVED" || item.status === "CONVERTED") {
      push(`${item.id}-approved`, item.reviewedAt, `${typeLabel} approved`);
    }
    if (item.status === "REJECTED") {
      push(`${item.id}-rejected`, item.reviewedAt, `${typeLabel} rejected`);
    }
  }

  return events.sort((a, b) => a.sort - b.sort);
}
