"use client";

import { Bot } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CustomerAiFabProps {
  onClick: () => void;
  open: boolean;
}

export function CustomerAiFab({ onClick, open }: CustomerAiFabProps) {
  return (
    <Button
      type="button"
      onClick={onClick}
      aria-label={open ? "Close AI Assistant" : "Open AI Assistant"}
      aria-expanded={open}
      aria-controls="customer-ai-drawer"
      className={cn(
        "fixed z-40 flex size-14 items-center justify-center rounded-full border border-primary/40 bg-primary text-primary-foreground shadow-[var(--shadow-lg)]",
        "bottom-20 right-4 sm:bottom-24 sm:right-6",
        "hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
    >
      <Bot className="size-6" strokeWidth={1.75} aria-hidden="true" />
      <span className="sr-only">AI Assistant</span>
    </Button>
  );
}
