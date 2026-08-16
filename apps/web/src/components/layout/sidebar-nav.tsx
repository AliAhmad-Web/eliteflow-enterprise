"use client";

import { usePathname } from "next/navigation";
import { memo, useCallback } from "react";

import type {
  NavigationItem,
  NavigationSection,
} from "@/config/navigation.config";
import { PrefetchLink } from "@/components/layout/prefetch-link";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface SidebarNavProps {
  sections: NavigationSection[];
  collapsed?: boolean;
  onNavigate?: () => void;
}

interface SidebarNavItemProps {
  item: NavigationItem;
  collapsed: boolean;
  isActive: boolean;
  onNavigate?: () => void;
}

const SidebarNavItem = memo(function SidebarNavItem({
  item,
  collapsed,
  isActive,
  onNavigate,
}: SidebarNavItemProps) {
  const Icon = item.icon;

  const link = (
    <PrefetchLink
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "group relative flex h-9 w-full items-center rounded-lg text-sm font-medium leading-none tracking-tight",
        "transition-[background-color,color,box-shadow] duration-150 ease-[var(--ease-enterprise)]",
        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        collapsed ? "justify-center px-0" : "gap-2.5 px-2.5",
        isActive
          ? "nav-item-active-glow bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground",
      )}
      aria-current={isActive ? "page" : undefined}
      aria-label={item.title}
    >
      {isActive ? (
        <span
          className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-sidebar-primary shadow-[0_0_8px_color-mix(in_srgb,var(--sidebar-primary)_45%,transparent)]"
          aria-hidden="true"
        />
      ) : null}
      <Icon
        className={cn(
          "icon-glyph-sm",
          isActive
            ? "text-sidebar-primary"
            : "text-sidebar-foreground/75 group-hover:text-sidebar-accent-foreground",
        )}
        strokeWidth={1.75}
        aria-hidden="true"
      />
      {!collapsed ? (
        <span className="min-w-0 flex-1 truncate text-left">{item.title}</span>
      ) : null}
      {item.badge ? (
        <span
          className={cn(
            "shrink-0 rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold leading-4 text-primary",
            collapsed
              ? "absolute right-1 top-1 min-w-4 px-1 text-[9px]"
              : "ml-auto",
          )}
          aria-label={`${item.badge} pending`}
        >
          {item.badge}
        </span>
      ) : null}
    </PrefetchLink>
  );

  if (!collapsed) {
    return <li className="list-none">{link}</li>;
  }

  return (
    <li className="list-none">
      <Tooltip delayDuration={80}>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={10} className="font-medium">
          {item.title}
        </TooltipContent>
      </Tooltip>
    </li>
  );
});

function SidebarNavComponent({
  sections,
  collapsed = false,
  onNavigate,
}: SidebarNavProps) {
  const pathname = usePathname();
  const handleNavigate = useCallback(() => {
    onNavigate?.();
  }, [onNavigate]);

  const list = (
    <nav className="flex flex-1 flex-col gap-6" aria-label="Main navigation">
      {sections.map((section, sectionIndex) => (
        <div
          key={section.label ?? `section-${sectionIndex}`}
          className="space-y-1"
        >
          {section.label && !collapsed ? (
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase leading-4 tracking-[0.14em] text-muted-foreground/55">
              {section.label}
            </p>
          ) : null}
          <ul className="space-y-1" role="list">
            {section.items.map((item) => {
              const isActive =
                pathname === item.href ||
                pathname.startsWith(`${item.href}/`);

              return (
                <SidebarNavItem
                  key={item.href}
                  item={item}
                  collapsed={collapsed}
                  isActive={isActive}
                  onNavigate={onNavigate ? handleNavigate : undefined}
                />
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  if (!collapsed) {
    return list;
  }

  return (
    <TooltipProvider delayDuration={80} skipDelayDuration={200}>
      {list}
    </TooltipProvider>
  );
}

export const SidebarNav = memo(SidebarNavComponent);
