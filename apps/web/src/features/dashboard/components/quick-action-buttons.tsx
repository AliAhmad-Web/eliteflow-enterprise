"use client";

import { useMemo } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePermissions } from "@/features/rbac/hooks/use-permissions";
import { filterActionsByPermission } from "@/features/rbac/utils/filter-navigation";
import { cn } from "@/lib/utils";

import type { QuickAction } from "@/features/dashboard/types/dashboard.types";

interface QuickActionButtonsProps {
  actions: QuickAction[];
  variant?: "grid" | "compact" | "dropdown";
  className?: string;
}

export function QuickActionButtons({
  actions,
  variant = "grid",
  className,
}: QuickActionButtonsProps) {
  const { subject } = usePermissions();
  const visibleActions = useMemo(
    () => filterActionsByPermission(actions, subject),
    [actions, subject],
  );

  if (visibleActions.length === 0) {
    return null;
  }

  if (variant === "dropdown") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className={className}>Create New</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {visibleActions.map((action) => {
            const Icon = action.icon;
            if (action.href) {
              return (
                <DropdownMenuItem key={action.id} asChild>
                  <Link href={action.href}>
                    <Icon className="mr-2 h-4 w-4" aria-hidden="true" />
                    {action.label}
                  </Link>
                </DropdownMenuItem>
              );
            }

            return (
              <DropdownMenuItem key={action.id} disabled>
                <Icon className="mr-2 h-4 w-4" aria-hidden="true" />
                {action.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (variant === "compact") {
    return (
      <QuickActionButtons
        actions={visibleActions}
        variant="dropdown"
        className={className}
      />
    );
  }

  return (
    <div
      className={cn("grid grid-cols-2 gap-2", className)}
      role="group"
      aria-label="Quick actions"
    >
      {visibleActions.map((action) => {
        const Icon = action.icon;
        if (action.href) {
          return (
            <Button
              key={action.id}
              type="button"
              variant="secondary"
              size="sm"
              className="h-9 justify-start gap-2 border-border/50 bg-background/70 text-xs hover:border-primary/25 hover:bg-accent/70"
              asChild
            >
              <Link href={action.href}>
                <Icon
                  className="h-3.5 w-3.5 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <span className="truncate">{action.label}</span>
              </Link>
            </Button>
          );
        }

        return (
          <Button
            key={action.id}
            type="button"
            variant="secondary"
            size="sm"
            className="h-9 justify-start gap-2 border-border/50 bg-background/70 text-xs hover:border-primary/25"
            disabled
            title="Coming soon"
          >
            <Icon
              className="h-3.5 w-3.5 shrink-0 text-primary"
              aria-hidden="true"
            />
            <span className="truncate">{action.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
