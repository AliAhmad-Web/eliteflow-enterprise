"use client";

import { Bot, Send } from "lucide-react";
import Link from "next/link";

import { QuickActionButtons } from "@/features/dashboard/components/quick-action-buttons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";

import type { QuickAction } from "@/features/dashboard/types/dashboard.types";

interface AiAssistantWidgetProps {
  actions: QuickAction[];
  title?: string;
  subtitle?: string;
  className?: string;
}

export function AiAssistantWidget({
  actions,
  title = "AI Assistant",
  subtitle = "Your smart business assistant",
  className,
}: AiAssistantWidgetProps) {
  return (
    <Card
      className={cn(
        "ai-surface border-primary/20 shadow-[var(--shadow-glow-primary)]",
        className,
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="icon-box icon-box-md rounded-xl bg-primary/15 ring-1 ring-primary/25">
            <Bot className="text-primary" strokeWidth={1.75} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-sm font-semibold tracking-tight">
              {title}
            </CardTitle>
            <p className="text-xs leading-4 text-muted-foreground">{subtitle}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <QuickActionButtons actions={actions} variant="grid" />
        <form
          className="flex gap-2"
          onSubmit={(e) => e.preventDefault()}
          aria-label="AI assistant prompt"
        >
          <Input
            placeholder="Ask anything..."
            className="border-primary/15 bg-background/70 focus-visible:border-primary/35"
            aria-label="Ask AI assistant"
            disabled
            title="AI chat opens in the full assistant"
          />
          <Button
            type="button"
            size="icon"
            className="shadow-[var(--shadow-xs)]"
            aria-label="Open AI assistant"
            asChild
          >
            <Link href={ROUTES.AI_ASSISTANT}>
              <Send className="h-4 w-4" strokeWidth={1.75} />
            </Link>
          </Button>
        </form>
        <p className="text-[11px] text-muted-foreground">
          Prompt chat ships with the AI module.{" "}
          <Link
            href={ROUTES.AI_ASSISTANT}
            className="text-primary underline-offset-2 hover:underline"
          >
            Open AI Assistant
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
