"use client";

import {
  Bot,
  CalendarPlus,
  FileText,
  FolderKanban,
  ListTodo,
  Plus,
  Users,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROUTES } from "@/constants/routes";
import { PERMISSIONS } from "@enterprise/shared";
import { usePermissions } from "@/features/rbac/hooks/use-permissions";

const QUICK_ACTIONS = [
  {
    href: ROUTES.TASKS,
    label: "New task",
    icon: ListTodo,
    permission: "tasks:write" as const,
  },
  {
    href: ROUTES.PROJECTS,
    label: "New project",
    icon: FolderKanban,
    permission: "projects:write" as const,
  },
  {
    href: ROUTES.CLIENTS,
    label: "New client",
    icon: Users,
    permission: "clients:write" as const,
  },
  {
    href: ROUTES.INVOICES,
    label: "New invoice",
    icon: FileText,
    permission: "invoices:write" as const,
  },
  {
    href: ROUTES.CALENDAR,
    label: "Calendar",
    icon: CalendarPlus,
    permission: "calendar:read" as const,
  },
] as const;

export function HeaderQuickActions() {
  const { hasPermission } = usePermissions();
  const canUseStaffAi = hasPermission(PERMISSIONS.AI_USE);

  const actions = QUICK_ACTIONS.filter((action) =>
    hasPermission(action.permission),
  );

  return (
    <div className="flex items-center gap-1">
      {canUseStaffAi ? (
      <Button
        asChild
        variant="ghost"
        size="icon"
        aria-label="Open AI Assistant"
        className="hover:bg-primary/10 hover:text-primary"
      >
        <Link href={ROUTES.AI_ASSISTANT}>
          <Bot strokeWidth={1.75} aria-hidden="true" />
        </Link>
      </Button>
      ) : null}

      {actions.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Quick actions" className="hover:bg-primary/10 hover:text-primary">
              <Plus strokeWidth={1.75} aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Quick actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <DropdownMenuItem key={action.href} asChild>
                  <Link href={action.href}>
                    <Icon className="icon-glyph-sm" aria-hidden="true" />
                    {action.label}
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}
