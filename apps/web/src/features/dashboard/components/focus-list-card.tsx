"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import type { DashboardFocusItem } from "@/features/dashboard/data/role-dashboards.dummy";

const toneClass: Record<NonNullable<DashboardFocusItem["tone"]>, string> = {
  default: "border-border/50",
  warning: "border-warning/40 bg-warning/5",
  success: "border-success/40 bg-success/5",
  danger: "border-destructive/40 bg-destructive/5",
};

interface FocusListCardProps {
  title: string;
  items: DashboardFocusItem[];
  className?: string;
}

export function FocusListCard({ title, items, className }: FocusListCardProps) {
  return (
    <Card className={cn("border-border/50 shadow-[var(--shadow-sm)]", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold tracking-tight">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2" aria-label={title}>
          {items.map((item) => (
            <li
              key={item.id}
              className={cn(
                "rounded-xl border p-3 transition-colors hover:bg-accent/40",
                toneClass[item.tone ?? "default"],
              )}
            >
              <p className="text-sm font-medium text-foreground">{item.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.meta}</p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
