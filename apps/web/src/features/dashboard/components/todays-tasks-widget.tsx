"use client";

import { Check } from "lucide-react";
import { useState } from "react";

import { EmptyState } from "@/components/common/feedback/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";

import type { DashboardTask } from "@/features/dashboard/types/dashboard.types";

const priorityVariant = {
  high: "destructive",
  medium: "warning",
  low: "info",
} as const;

interface TodaysTasksWidgetProps {
  tasks: DashboardTask[];
  title?: string;
  className?: string;
}

export function TodaysTasksWidget({
  tasks: initialTasks,
  title = "Today's Tasks",
  className,
}: TodaysTasksWidgetProps) {
  const [tasks, setTasks] = useState(initialTasks);

  const toggleTask = (taskId: string) => {
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task,
      ),
    );
  };

  return (
    <Card className={cn("border-border/50 shadow-[var(--shadow-sm)]", className)}>
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-semibold tracking-tight">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {tasks.length === 0 ? (
          <EmptyState
            title="No tasks for today"
            description="Assigned work will appear here."
            actionLabel="Open tasks"
            actionHref={ROUTES.TASKS}
            className="min-h-[160px] border-0 bg-transparent py-6"
          />
        ) : (
          <ul className="space-y-2" aria-label={title}>
            {tasks.map((task) => (
              <li
                key={task.id}
                className={cn(
                  "flex items-center gap-3 rounded-xl border border-border/40 bg-muted/15 p-3 transition-colors hover:border-primary/20 hover:bg-accent/50",
                  task.completed && "opacity-60",
                )}
              >
                <button
                  type="button"
                  className={cn(
                    "icon-box icon-box-sm rounded-md border transition-colors",
                    task.completed
                      ? "border-success bg-success text-success-foreground"
                      : "border-border bg-background hover:border-primary",
                  )}
                  aria-label={
                    task.completed
                      ? `Mark ${task.title} incomplete`
                      : `Mark ${task.title} complete`
                  }
                  aria-pressed={task.completed}
                  onClick={() => toggleTask(task.id)}
                >
                  {task.completed ? (
                    <Check className="icon-glyph-sm" strokeWidth={2} aria-hidden="true" />
                  ) : null}
                </button>
                <div className="min-w-0 flex-1 space-y-1">
                  <p
                    className={cn(
                      "truncate text-sm font-medium leading-5 text-foreground",
                      task.completed && "line-through",
                    )}
                  >
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={priorityVariant[task.priority]}
                      className="h-5 px-2 text-[10px] leading-none capitalize"
                    >
                      {task.priority}
                    </Badge>
                    <span className="text-xs leading-4 text-muted-foreground">
                      {task.time}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
