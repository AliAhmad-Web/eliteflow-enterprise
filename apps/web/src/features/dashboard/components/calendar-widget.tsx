"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import type { CalendarDay } from "@/features/dashboard/types/dashboard.types";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

interface CalendarWidgetProps {
  monthLabel: string;
  days: CalendarDay[];
  title?: string;
  className?: string;
}

export function CalendarWidget({
  monthLabel,
  days,
  title = "Calendar",
  className,
}: CalendarWidgetProps) {
  return (
    <Card className={cn("border-border/50 shadow-[var(--shadow-sm)]", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-sm font-semibold tracking-tight">
          {title}
        </CardTitle>
        <div className="flex items-center gap-1 rounded-lg border border-border/50 bg-muted/30 p-0.5">
          <Button variant="ghost" size="icon-sm" aria-label="Previous month" disabled>
            <ChevronLeft strokeWidth={1.75} />
          </Button>
          <span className="min-w-[90px] text-center text-xs font-medium leading-4 tracking-tight text-foreground">
            {monthLabel}
          </span>
          <Button variant="ghost" size="icon-sm" aria-label="Next month" disabled>
            <ChevronRight strokeWidth={1.75} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div
          className="grid grid-cols-7 gap-1 text-center"
          role="grid"
          aria-label={`Calendar for ${monthLabel}`}
        >
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
              role="columnheader"
            >
              {day}
            </div>
          ))}
          {days.map((day, index) => (
            <div
              key={`${day.date}-${index}`}
              className={cn(
                "relative mx-auto flex h-8 w-8 items-center justify-center rounded-lg text-xs transition-colors",
                !day.isCurrentMonth && "text-muted-foreground/40",
                day.isCurrentMonth && "text-foreground hover:bg-accent/70",
                day.isToday &&
                  "bg-primary font-semibold text-primary-foreground shadow-[var(--shadow-glow-primary)] hover:bg-primary",
              )}
              aria-label={`${monthLabel} ${day.date}${day.hasEvent ? ", has events" : ""}${day.isToday ? ", today" : ""}`}
              aria-current={day.isToday ? "date" : undefined}
              role="gridcell"
            >
              {day.date}
              {day.hasEvent && !day.isToday ? (
                <span
                  className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary"
                  aria-hidden="true"
                />
              ) : null}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
