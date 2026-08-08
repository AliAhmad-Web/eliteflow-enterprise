"use client";

import { Suspense, memo } from "react";
import dynamic from "next/dynamic";

import { AppFooter } from "@/components/layout/app-footer";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { DashboardRouteWarmup } from "@/components/layout/dashboard-route-warmup";
import { KeepAliveOutlet } from "@/components/layout/keep-alive-outlet";
import { NavigationProgress } from "@/components/layout/navigation-progress";
import { RightPanel } from "@/components/layout/right-panel";
import { useUiStore } from "@/stores/ui.store";

const MustChangePasswordGate = dynamic(
  () =>
    import("@/features/auth/components/must-change-password-gate").then(
      (m) => m.MustChangePasswordGate,
    ),
  { ssr: false, loading: () => null },
);

interface DashboardShellProps {
  children: React.ReactNode;
}

function DashboardShellComponent({ children }: DashboardShellProps) {
  const rightPanelOpen = useUiStore((state) => state.rightPanelOpen);
  const toggleRightPanel = useUiStore((state) => state.toggleRightPanel);

  return (
    <div className="flex min-h-svh bg-background">
      <MustChangePasswordGate />
      <DashboardRouteWarmup />
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to main content
      </a>
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader />
        <div className="flex min-h-0 flex-1">
          <main
            id="main-content"
            className="scrollbar-thin flex-1 overflow-x-hidden overflow-y-auto px-3 py-5 sm:px-4 sm:py-6 lg:px-8 lg:py-8 min-[2560px]:px-10"
            tabIndex={-1}
          >
            <KeepAliveOutlet>{children}</KeepAliveOutlet>
            <AppFooter className="mt-8" />
          </main>
          <RightPanel open={rightPanelOpen} onToggle={toggleRightPanel} />
        </div>
      </div>
    </div>
  );
}

export const DashboardShell = memo(DashboardShellComponent);
