"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QuickActionButtons } from "@/features/dashboard/components/quick-action-buttons";
import { QUICK_ACCESS_ACTIONS } from "@/features/dashboard/config/quick-access.actions";
import { cn } from "@/lib/utils";

interface QuickAccessWidgetProps {
  title?: string;
  className?: string;
}

export function QuickAccessWidget({
  title = "Shortcuts",
  className,
}: QuickAccessWidgetProps) {
  return (
    <Card className={cn("border-border/50 shadow-[var(--shadow-sm)]", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold tracking-tight">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <QuickActionButtons actions={QUICK_ACCESS_ACTIONS} variant="grid" />
      </CardContent>
    </Card>
  );
}
