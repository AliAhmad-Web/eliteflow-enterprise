"use client";

import { ROLE_DASHBOARD_ROUTES, type UserRole } from "@enterprise/shared";
import { Crown, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { memo, useMemo } from "react";

import { PrefetchLink } from "@/components/layout/prefetch-link";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MAIN_NAVIGATION } from "@/config/navigation.config";
import { siteConfig } from "@/config/site.config";
import { ROUTES } from "@/constants/routes";
import { filterNavigationByCommunicationFlags } from "@/features/communication/utils/filter-communication-nav";
import { usePermissions } from "@/features/rbac/hooks/use-permissions";
import { filterNavigationByAccess } from "@/features/rbac/utils/filter-navigation";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui.store";

interface AppSidebarProps {
  className?: string;
}

const toggleButtonClassName = cn(
  "size-9 shrink-0 rounded-lg border border-sidebar-border/80 bg-card/50 text-sidebar-foreground shadow-[var(--shadow-xs)]",
  "transition-colors duration-150 ease-out",
  "hover:border-primary/25 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
);

/**
 * Fixed sidebar from tablet (md+) up; mobile uses the slide drawer.
 * Collapse preference is persisted in `eliteflow-ui` (Zustand).
 */
function AppSidebarComponent({ className }: AppSidebarProps) {
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);
  const toggleSidebarCollapsed = useUiStore(
    (state) => state.toggleSidebarCollapsed,
  );
  const { isLgUp } = useBreakpoint();
  const { subject, role } = usePermissions();

  const sections = useMemo(
    () =>
      filterNavigationByCommunicationFlags(
        filterNavigationByAccess(MAIN_NAVIGATION, subject),
      ),
    [subject],
  );

  const homeHref =
    (role && ROLE_DASHBOARD_ROUTES[role as UserRole]) || ROUTES.DASHBOARD;

  const widthClass = sidebarCollapsed
    ? "w-[72px]"
    : isLgUp
      ? "w-[260px] 2xl:w-[280px]"
      : "w-[240px]";

  const toggleLabel = sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar";

  const toggleButton = (
    <Tooltip delayDuration={100}>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={toggleButtonClassName}
          onClick={toggleSidebarCollapsed}
          aria-label={toggleLabel}
          aria-expanded={!sidebarCollapsed}
          aria-controls="sidebar-nav-region"
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="icon-glyph-sm" aria-hidden="true" />
          ) : (
            <PanelLeftClose className="icon-glyph-sm" aria-hidden="true" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent
        side={sidebarCollapsed ? "right" : "bottom"}
        sideOffset={sidebarCollapsed ? 10 : 6}
      >
        {toggleLabel}
      </TooltipContent>
    </Tooltip>
  );

  return (
    <aside
      className={cn(
        "sidebar-glass sticky top-0 hidden h-svh shrink-0 flex-col border-r border-sidebar-border md:flex",
        widthClass,
        "transition-[width] duration-200 ease-out motion-reduce:transition-none",
        className,
      )}
      aria-label="Application sidebar"
      data-collapsed={sidebarCollapsed ? "true" : "false"}
    >
      <div
        className={cn(
          "shrink-0 border-b border-sidebar-border",
          sidebarCollapsed
            ? "flex flex-col items-center gap-2 px-2 py-3"
            : "flex h-16 items-center gap-2 px-3",
        )}
      >
        <PrefetchLink
          href={homeHref}
          className={cn(
            "flex min-w-0 items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
            sidebarCollapsed && "justify-center",
            !sidebarCollapsed && "flex-1",
          )}
          aria-label={`${siteConfig.name} home`}
        >
          <div className="icon-box icon-box-sm rounded-xl bg-linear-to-br from-brand-gold/20 to-brand-gold/5 ring-1 ring-brand-gold/20">
            <Crown className="text-brand-gold" strokeWidth={1.75} aria-hidden="true" />
          </div>
          {!sidebarCollapsed ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight text-foreground">
                {siteConfig.name}
              </p>
              <p className="truncate text-[11px] text-muted-foreground/80">
                {siteConfig.tagline}
              </p>
            </div>
          ) : null}
        </PrefetchLink>

        {toggleButton}
      </div>

      <div
        id="sidebar-nav-region"
        className="flex flex-1 flex-col overflow-hidden px-3 py-4"
      >
        <div className="scrollbar-thin flex-1 overflow-y-auto">
          <SidebarNav sections={sections} collapsed={sidebarCollapsed} />
        </div>
      </div>
    </aside>
  );
}

export const AppSidebar = memo(AppSidebarComponent);
