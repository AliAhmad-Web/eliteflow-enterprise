"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/common/feedback/empty-state";
import { ProjectStatusBadge } from "@/components/common/display/status-badge";
import { UserAvatarGroup } from "@/components/common/display/user-avatar-group";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";

import type { RecentProject } from "@/features/dashboard/types/dashboard.types";

interface RecentProjectsCardProps {
  projects: RecentProject[];
  title?: string;
  className?: string;
  viewAllHref?: string;
}

export function RecentProjectsCard({
  projects,
  title = "Recent Projects",
  className,
  viewAllHref = ROUTES.PROJECTS,
}: RecentProjectsCardProps) {
  return (
    <Card className={cn("border-border/50 overflow-hidden shadow-(--shadow-sm)", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base font-semibold tracking-tight">{title}</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-xs text-primary hover:text-primary"
          asChild
        >
          <Link href={viewAllHref}>
            View all
            <ArrowRight strokeWidth={1.75} aria-hidden="true" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {projects.length === 0 ? (
          <EmptyState
            title="No projects yet"
            description="Projects you work on will show up here."
            actionLabel="Browse projects"
            actionHref={viewAllHref}
            className="min-h-50 border-0 bg-transparent"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full min-w-120 text-sm">
              <thead>
                <tr>
                  <th scope="col">Project</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="hidden md:table-cell">
                    Team
                  </th>
                  <th scope="col" className="text-right!">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id}>
                    <td>
                      <div>
                        <p className="font-medium tracking-tight text-foreground">
                          {project.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {project.company}
                        </p>
                      </div>
                    </td>
                    <td>
                      <ProjectStatusBadge status={project.status} />
                    </td>
                    <td className="hidden md:table-cell">
                      <UserAvatarGroup members={project.team} />
                    </td>
                    <td className="text-right text-muted-foreground tabular-nums">
                      {project.date}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
