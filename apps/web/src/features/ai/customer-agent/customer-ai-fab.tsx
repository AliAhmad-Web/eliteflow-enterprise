"use client";

import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface CustomerAiFabProps {
  onClick: () => void;
  open: boolean;
}

export function CustomerAiFab({ onClick, open }: CustomerAiFabProps) {
  return (
    <Tooltip delayDuration={120}>
      <TooltipTrigger asChild>
        <Button
          type="button"
          onClick={onClick}
          aria-label="AI Agent"
          aria-expanded={open}
          aria-controls="customer-ai-drawer"
          className={cn(
            "ai-agent-fab group fixed z-40 size-14 rounded-full p-0",
            "bottom-20 right-4 sm:bottom-24 sm:right-6",
            "border border-primary/35 bg-primary text-primary-foreground",
            "shadow-[0_8px_22px_color-mix(in_srgb,var(--primary)_22%,transparent)]",
            "hover:bg-primary/92 hover:border-primary/50",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            open && "ai-agent-fab-open ring-2 ring-primary/40 ring-offset-2 ring-offset-background",
          )}
        >
          <span
            className="ai-agent-fab-glow pointer-events-none absolute inset-[-10px] rounded-full"
            aria-hidden="true"
          />
          <span className="relative flex size-full items-center justify-center">
            <Sparkles
              className="size-[1.35rem] drop-shadow-[0_0_10px_color-mix(in_srgb,white_35%,transparent)]"
              strokeWidth={1.6}
              aria-hidden="true"
            />
          </span>
        </Button>
      </TooltipTrigger>
      <TooltipContent
        side="left"
        sideOffset={12}
        className="border-primary/20 bg-popover px-3 py-1.5 text-[13px] tracking-wide shadow-[0_8px_24px_color-mix(in_srgb,var(--primary)_18%,transparent)]"
      >
        AI Agent
      </TooltipContent>
    </Tooltip>
  );
}
