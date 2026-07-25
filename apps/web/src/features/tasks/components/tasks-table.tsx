"use client";

import type { ListTasksQueryInput, Task } from "@enterprise/shared";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import { TaskPriorityBadge } from "./task-priority-badge";
import { TaskStatusBadge } from "./task-status-badge";

type SortField = ListTasksQueryInput["sortBy"];

interface TasksTableProps {
  tasks: Task[];
  sortBy: SortField;
  sortOrder: "asc" | "desc";
  onSort: (field: SortField) => void;
  onView: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  canEditTask: (task: Task) => boolean;
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

function TaskRowActions({
  task,
  onView,
  onEdit,
  onDelete,
  canEditTask,
  canDelete,
}: {
  task: Task;
  onView: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  canEditTask: (task: Task) => boolean;
  canDelete: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="touch-target-auto"
          aria-label={`Actions for ${task.title}`}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onView(task)}>
          <Eye className="h-4 w-4" />
          View
        </DropdownMenuItem>
        {canEditTask(task) ? (
          <DropdownMenuItem onClick={() => onEdit(task)}>
            <Pencil className="h-4 w-4" />
            Edit
          </DropdownMenuItem>
        ) : null}
        {canDelete ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete(task)}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function TasksTable({
  tasks,
  sortBy,
  sortOrder,
  onSort,
  onView,
  onEdit,
  onDelete,
  canEditTask,
  canDelete,
}: TasksTableProps) {
  if (tasks.length === 0) {
    return (
      <EmptyState
        title="No tasks found"
        description="Try adjusting search or filters, or create a new task."
        className="border-0 bg-transparent"
      />
    );
  }

  const columns: { field: SortField; label: string; className?: string }[] = [
    { field: "title", label: "Task" },
    { field: "status", label: "Status" },
    { field: "priority", label: "Priority", className: "hidden lg:table-cell" },
    { field: "dueDate", label: "Due", className: "hidden xl:table-cell" },
    { field: "progress", label: "Progress", className: "hidden 2xl:table-cell" },
  ];

  const actionProps = { onView, onEdit, onDelete, canEditTask, canDelete };

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
          {tasks.map((task) => {
            const assigneeName = task.assignedTo
              ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}`
              : "Unassigned";

            return (
              <tr
                key={task.id}
                className="border-b border-border/50 last:border-0 hover:bg-muted/20"
              >
                <td className="px-3 py-3 lg:px-4">
                  <button
                    type="button"
                    className="text-left font-medium text-foreground hover:underline focus-visible:outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring/50"
                    onClick={() => onView(task)}
                  >
                    {task.title}
                  </button>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {task.projectName ?? "No project"} · {assigneeName}
                  </p>
                  {task.labels.length > 0 ? (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {task.labels.slice(0, 3).map((label) => (
                        <Badge
                          key={label}
                          variant="outline"
                          className="text-[10px]"
                        >
                          {label}
                        </Badge>
                      ))}
                      {task.labels.length > 3 ? (
                        <Badge variant="outline" className="text-[10px]">
                          +{task.labels.length - 3}
                        </Badge>
                      ) : null}
                    </div>
                  ) : null}
                </td>
                <td className="px-3 py-3 lg:px-4">
                  <TaskStatusBadge status={task.status} />
                </td>
                <td className="hidden px-3 py-3 lg:table-cell lg:px-4">
                  <TaskPriorityBadge priority={task.priority} />
                </td>
                <td className="hidden px-3 py-3 text-muted-foreground xl:table-cell xl:px-4">
                  {task.dueDate ?? "—"}
                </td>
                <td className="hidden px-3 py-3 2xl:table-cell 2xl:px-4">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {task.progress}%
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3 text-right lg:px-4">
                  <TaskRowActions task={task} {...actionProps} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const cards = (
    <VirtualizedList
      items={tasks}
      estimateSize={140}
      getItemKey={(task) => task.id}
      renderItem={(task) => {
        const assigneeName = task.assignedTo
          ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}`
          : "Unassigned";

        return (
          <div className="pb-3">
            <div className="rounded-xl border border-border/50 bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring/50"
                  onClick={() => onView(task)}
                >
                  <p className="font-medium text-foreground">{task.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {task.projectName ?? "No project"} · {assigneeName}
                  </p>
                </button>
                <TaskRowActions task={task} {...actionProps} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <TaskStatusBadge status={task.status} />
                <TaskPriorityBadge priority={task.priority} />
                {task.dueDate ? (
                  <span className="text-xs text-muted-foreground">
                    Due {task.dueDate}
                  </span>
                ) : null}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  {task.progress}%
                </span>
              </div>
            </div>
          </div>
        );
      }}
    />
  );

  return <ResponsiveDataView table={table} cards={cards} />;
}
