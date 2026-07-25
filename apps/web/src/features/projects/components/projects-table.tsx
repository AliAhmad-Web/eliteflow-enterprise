"use client";

import type { ListProjectsQueryInput, Project } from "@enterprise/shared";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Eye,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";

import { ResponsiveDataView } from "@/components/common/data/responsive-data-view";
import { VirtualizedList } from "@/components/common/data/virtualized-list";
import { EmptyState } from "@/components/common/feedback/empty-state";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import { ProjectPriorityBadge } from "./project-priority-badge";
import { ProjectStatusBadge } from "./project-status-badge";

type SortField = ListProjectsQueryInput["sortBy"];

interface ProjectsTableProps {
  projects: Project[];
  sortBy: SortField;
  sortOrder: "asc" | "desc";
  onSort: (field: SortField) => void;
  onView: (project: Project) => void;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  canWrite: boolean;
  canDelete: boolean;
}

function SortIcon({
  active,
  order,
}: {
  active: boolean;
  order: "asc" | "desc";
}) {
  if (!active) {
    return <ArrowUpDown className="h-3.5 w-3.5 opacity-50" aria-hidden="true" />;
  }

  return order === "asc" ? (
    <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
  ) : (
    <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
  );
}

function ProjectRowActions({
  project,
  onView,
  onEdit,
  onDelete,
  canWrite,
  canDelete,
}: {
  project: Project;
  onView: (project: Project) => void;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  canWrite: boolean;
  canDelete: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="touch-target-auto"
          aria-label={`Actions for ${project.name}`}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onSelect={() => onView(project)}>
          <Eye className="mr-2 h-4 w-4" aria-hidden="true" />
          View details
        </DropdownMenuItem>
        {canWrite ? (
          <DropdownMenuItem onSelect={() => onEdit(project)}>
            <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
            Edit
          </DropdownMenuItem>
        ) : null}
        {canDelete ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => onDelete(project)}
            >
              <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
              Delete
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ProjectsTable({
  projects,
  sortBy,
  sortOrder,
  onSort,
  onView,
  onEdit,
  onDelete,
  canWrite,
  canDelete,
}: ProjectsTableProps) {
  if (projects.length === 0) {
    return (
      <EmptyState
        title="No projects found"
        description="Try adjusting search or filters, or create a new project."
        className="border-0 bg-transparent"
      />
    );
  }

  const columns: { field: SortField; label: string; className?: string }[] = [
    { field: "name", label: "Project" },
    { field: "status", label: "Status" },
    { field: "priority", label: "Priority", className: "hidden lg:table-cell" },
    { field: "dueDate", label: "Due", className: "hidden xl:table-cell" },
    { field: "progress", label: "Progress", className: "hidden 2xl:table-cell" },
  ];

  const actionProps = { onView, onEdit, onDelete, canWrite, canDelete };

  const table = (
    <div className="overflow-x-auto enterprise-table-shell">
      <table className="table-sticky-header w-full min-w-[640px] text-sm md:min-w-0">
        <thead>
          <tr className="border-b border-border/60">
            {columns.map((column) => (
              <th
                key={column.field}
                scope="col"
                className={cn(
                  "px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80 lg:px-4",
                  column.className,
                )}
              >
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-md hover:text-foreground focus-visible:outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring/50"
                  onClick={() => onSort(column.field)}
                  aria-label={`Sort by ${column.label}`}
                >
                  {column.label}
                  <SortIcon
                    active={sortBy === column.field}
                    order={sortOrder}
                  />
                </button>
              </th>
            ))}
            <th
              scope="col"
              className="px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80 lg:px-4"
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr
              key={project.id}
              className="border-b border-border/50 transition-colors last:border-0 hover:bg-accent/40"
            >
              <td className="px-3 py-3 lg:px-4">
                <div>
                  <p className="font-medium text-foreground">{project.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {project.clientName ?? "No client"}
                  </p>
                </div>
              </td>
              <td className="px-3 py-3 lg:px-4">
                <ProjectStatusBadge status={project.status} />
              </td>
              <td className="hidden px-3 py-3 lg:table-cell lg:px-4">
                <ProjectPriorityBadge priority={project.priority} />
              </td>
              <td className="hidden px-3 py-3 text-muted-foreground xl:table-cell xl:px-4">
                {project.dueDate
                  ? new Date(project.dueDate).toLocaleDateString()
                  : "—"}
              </td>
              <td className="hidden px-3 py-3 2xl:table-cell 2xl:px-4">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {project.progress}%
                  </span>
                </div>
              </td>
              <td className="px-3 py-3 text-right lg:px-4">
                <ProjectRowActions project={project} {...actionProps} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const cards = (
    <VirtualizedList
      items={projects}
      estimateSize={140}
      getItemKey={(project) => project.id}
      renderItem={(project) => (
        <div className="pb-3">
          <div className="rounded-xl border border-border/50 bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <button
                type="button"
                className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring/50"
                onClick={() => onView(project)}
              >
                <p className="font-medium text-foreground">{project.name}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {project.clientName ?? "No client"}
                </p>
              </button>
              <ProjectRowActions project={project} {...actionProps} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <ProjectStatusBadge status={project.status} />
              <ProjectPriorityBadge priority={project.priority} />
              {project.dueDate ? (
                <span className="text-xs text-muted-foreground">
                  Due {new Date(project.dueDate).toLocaleDateString()}
                </span>
              ) : null}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${project.progress}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {project.progress}%
              </span>
            </div>
          </div>
        </div>
      )}
    />
  );

  return <ResponsiveDataView table={table} cards={cards} />;
}
