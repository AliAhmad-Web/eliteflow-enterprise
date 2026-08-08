"use client";

import { PanelRightClose, PanelRightOpen } from "lucide-react";
import dynamic from "next/dynamic";
import { memo } from "react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const DashboardRightPanelContent = dynamic(
  () =>
    import("@/features/dashboard/components/dashboard-right-panel-content").then(
      (m) => m.DashboardRightPanelContent,
    ),
  { ssr: false, loading: () => null },
);

interface RightPanelProps {
  open: boolean;
  onToggle: () => void;
  className?: string;
}

const toggleButtonClassName = cn(
  "size-9 shrink-0 rounded-lg border border-sidebar-border/80 bg-card/50 text-sidebar-foreground shadow-[var(--shadow-xs)]",
  "transition-colors duration-150 ease-out",
  "hover:border-primary/25 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
);

function RightPanelComponent({ open, onToggle, className }: RightPanelProps) {
  if (!open) {
    return (
      <div className="hidden xl:flex">
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                toggleButtonClassName,
                "fixed right-4 top-[4.75rem] z-20",
              )}
              onClick={onToggle}
              aria-label="Open utility panel"
              aria-expanded={false}
              aria-controls="utility-panel"
            >
              <PanelRightOpen className="icon-glyph-sm" aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" sideOffset={10}>
            Open utility panel
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <aside
      id="utility-panel"
      className={cn(
        "sidebar-glass hidden w-[320px] shrink-0 flex-col border-l border-sidebar-border xl:flex",
        className,
      )}
      aria-label="Utility panel"
    >
      <div className="flex h-16 items-center justify-between gap-3 border-b border-sidebar-border px-4">
        <p className="text-sm font-semibold tracking-tight text-foreground">
          Quick Access
        </p>
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={toggleButtonClassName}
              onClick={onToggle}
              aria-label="Close utility panel"
              aria-expanded={true}
              aria-controls="utility-panel"
            >
              <PanelRightClose className="icon-glyph-sm" aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Close utility panel</TooltipContent>
        </Tooltip>
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto p-4">
        <DashboardRightPanelContent />
      </div>
    </aside>
  );
}

RightPanelComponent.displayName = "RightPanel";

export const RightPanel = memo(RightPanelComponent);
