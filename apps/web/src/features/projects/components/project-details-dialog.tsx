"use client";

import type { Project } from "@enterprise/shared";
import { PERMISSIONS } from "@enterprise/shared";
import { ExternalLink, Paperclip, Users } from "lucide-react";

import { ErrorState } from "@/components/common/feedback/error-state";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PermissionGuard } from "@/features/rbac/components/permission-guards";
import { EntityCommentsPanel } from "@/features/communication/components/entity-comments-panel";

import { useProject } from "../hooks/use-projects";
import {
  MILESTONE_STATUS_LABELS,
} from "../types/projects.types";
import { ProjectPriorityBadge } from "./project-priority-badge";
import { ProjectStatusBadge } from "./project-status-badge";

interface ProjectDetailsDialogProps {
  open: boolean;
  projectId: string | null;
  onOpenChange: (open: boolean) => void;
  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="grid gap-1 sm:grid-cols-[140px_1fr] sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{value || "—"}</dd>
    </div>
  );
}

export function ProjectDetailsDialog({
  open,
  projectId,
  onOpenChange,
  onEdit,
  onDelete,
}: ProjectDetailsDialogProps) {
  const { data: project, isLoading, isError, error, refetch } = useProject(
    open ? projectId : null,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Project details</DialogTitle>
          <DialogDescription>
            Timeline, team, milestones, and attachments.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <LoadingState
            label="Loading project"
            className="min-h-[200px] border-0 bg-transparent"
          />
        ) : null}

        {isError ? (
          <ErrorState
            title="Could not load project"
            description={
              error instanceof Error ? error.message : "Please try again."
            }
            onRetry={() => void refetch()}
            className="min-h-[200px]"
          />
        ) : null}

        {project ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-foreground">
                  {project.name}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {project.clientName ?? "No client assigned"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <ProjectStatusBadge status={project.status} />
                <ProjectPriorityBadge priority={project.priority} />
              </div>
            </div>

            {project.description ? (
              <p className="text-sm text-muted-foreground">
                {project.description}
              </p>
            ) : null}

            <dl className="space-y-3 rounded-xl border border-border/50 bg-muted/20 p-4">
              <DetailRow
                label="Timeline"
                value={
                  project.startDate || project.dueDate
                    ? `${project.startDate ? new Date(project.startDate).toLocaleDateString() : "—"} → ${
                        project.dueDate
                          ? new Date(project.dueDate).toLocaleDateString()
                          : "—"
                      }`
                    : null
                }
              />
              <DetailRow
                label="Progress"
                value={
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-28 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                    <span>{project.progress}%</span>
                  </div>
                }
              />
              <DetailRow
                label="Budget"
                value={
                  project.budget != null
                    ? new Intl.NumberFormat(undefined, {
                        style: "currency",
                        currency: "USD",
                        maximumFractionDigits: 0,
                      }).format(project.budget)
                    : null
                }
              />
              <DetailRow
                label="Created"
                value={new Date(project.createdAt).toLocaleString()}
              />
              <DetailRow
                label="Updated"
                value={new Date(project.updatedAt).toLocaleString()}
              />
            </dl>

            <section className="space-y-3">
              <h4 className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Users className="h-4 w-4" aria-hidden="true" />
                Team
              </h4>
              {project.members.length === 0 ? (
                <p className="text-sm text-muted-foreground">No members assigned.</p>
              ) : (
                <ul className="space-y-2">
                  {project.members.map((member) => (
                    <li
                      key={member.id}
                      className="rounded-lg border border-border/50 px-3 py-2 text-sm"
                    >
                      <p className="font-medium text-foreground">
                        {member.firstName} {member.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {member.email}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">Milestones</h4>
              {project.milestones.length === 0 ? (
                <p className="text-sm text-muted-foreground">No milestones.</p>
              ) : (
                <ol className="relative space-y-4 border-l border-border/70 pl-4">
                  {project.milestones.map((milestone) => (
                    <li key={milestone.id} className="relative">
                      <span className="absolute -left-[1.3rem] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-foreground">
                            {milestone.title}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {MILESTONE_STATUS_LABELS[milestone.status]}
                          </span>
                        </div>
                        {milestone.dueDate ? (
                          <p className="text-xs text-muted-foreground">
                            Due {new Date(milestone.dueDate).toLocaleDateString()}
                          </p>
                        ) : null}
                        {milestone.description ? (
                          <p className="text-sm text-muted-foreground">
                            {milestone.description}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section className="space-y-3">
              <h4 className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Paperclip className="h-4 w-4" aria-hidden="true" />
                Attachments
              </h4>
              {project.attachments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No attachments.</p>
              ) : (
                <ul className="space-y-2">
                  {project.attachments.map((attachment) => (
                    <li key={attachment.id}>
                      <a
                        href={attachment.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                      >
                        {attachment.fileName}
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-3 rounded-xl border border-border/50 p-4">
              <h4 className="text-sm font-semibold text-foreground">
                Feedback & change requests
              </h4>
              <p className="text-xs text-muted-foreground">
                Share project feedback with the EliteFlow team. Comments stay
                scoped to this project.
              </p>
              <EntityCommentsPanel
                entityType="PROJECT"
                entityId={project.id}
              />
            </section>

            <DialogFooter className="gap-2 sm:justify-between">
              <Button
                type="button"
                variant="secondary"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
              <div className="flex flex-wrap gap-2">
                <PermissionGuard permission={PERMISSIONS.PROJECTS_WRITE}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onEdit?.(project)}
                  >
                    Edit
                  </Button>
                </PermissionGuard>
                <PermissionGuard permission={PERMISSIONS.PROJECTS_DELETE}>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => onDelete?.(project)}
                  >
                    Delete
                  </Button>
                </PermissionGuard>
              </div>
            </DialogFooter>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
