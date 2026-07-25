"use client";

import { Bot, Menu, Plus } from "lucide-react";
import { useMemo } from "react";

import { PrefetchLink } from "@/components/layout/prefetch-link";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { MAIN_NAVIGATION } from "@/config/navigation.config";
import { ROUTES } from "@/constants/routes";
import { usePermissions } from "@/features/rbac/hooks/use-permissions";
import { filterNavigationByAccess } from "@/features/rbac/utils/filter-navigation";
import { useUiStore } from "@/stores/ui.store";

export function MobileNav() {
  const mobileSidebarOpen = useUiStore((state) => state.mobileSidebarOpen);
  const setMobileSidebarOpen = useUiStore((state) => state.setMobileSidebarOpen);
  const { subject } = usePermissions();

  const sections = useMemo(
    () => filterNavigationByAccess(MAIN_NAVIGATION, subject),
    [subject],
  );

  return (
    <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
      <Button
        variant="ghost"
        size="icon"
        className="touch-target-auto md:hidden"
        onClick={() => setMobileSidebarOpen(true)}
        aria-label="Open navigation menu"
        aria-expanded={mobileSidebarOpen}
        aria-controls="mobile-navigation-drawer"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <SheetContent
        side="left"
        id="mobile-navigation-drawer"
        className="w-[min(100vw,300px)] p-0 sm:w-[280px]"
      >
        <SheetTitle className="sr-only">Navigation menu</SheetTitle>
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4 pr-12">
          <p className="text-sm font-semibold tracking-tight text-foreground">EliteFlow</p>
        </div>
        <div className="scrollbar-thin flex h-[calc(100svh-4rem)] flex-col overflow-y-auto p-3">
          <SidebarNav
            sections={sections}
            onNavigate={() => setMobileSidebarOpen(false)}
          />
          <div className="mt-auto space-y-2 border-t border-sidebar-border pt-4">
            <Button
              asChild
              variant="secondary"
              className="w-full justify-start touch-target-auto"
            >
              <PrefetchLink
                href={ROUTES.AI_ASSISTANT}
                onClick={() => setMobileSidebarOpen(false)}
              >
                <Bot className="h-4 w-4" aria-hidden="true" />
                AI Assistant
              </PrefetchLink>
            </Button>
            <Button
              asChild
              className="w-full justify-start touch-target-auto"
            >
              <PrefetchLink
                href={ROUTES.TASKS}
                onClick={() => setMobileSidebarOpen(false)}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Quick create
              </PrefetchLink>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
