"use client";

import { ChevronLeft, ChevronRight, ExternalLink, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/constants/routes";
import { useSidebarCalendar } from "@/features/dashboard/hooks/use-sidebar-calendar";
import { formatEventTime } from "@/features/calendar/types/calendar.types";
import { ApiClientError } from "@/services/api/api-error";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

interface CalendarWidgetProps {
  title?: string;
  className?: string;
}

export function CalendarWidget({
  title = "Calendar",
  className,
}: CalendarWidgetProps) {
  const router = useRouter();
  const {
    canRead,
    monthLabel,
    dayCells,
    selectedEvents,
    setSelectedDay,
    goPrevMonth,
    goNextMonth,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useSidebarCalendar();

  if (!canRead) {
    return null;
  }

  return (
    <Card className={cn("border-border/50 shadow-[var(--shadow-sm)]", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-sm font-semibold tracking-tight">
          {title}
        </CardTitle>
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-0.5 rounded-lg border border-border/50 bg-muted/30 p-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Previous month"
              onClick={goPrevMonth}
            >
              <ChevronLeft strokeWidth={1.75} />
            </Button>
            <span className="min-w-[90px] text-center text-xs font-medium leading-4 tracking-tight text-foreground">
              {monthLabel}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Next month"
              onClick={goNextMonth}
            >
              <ChevronRight strokeWidth={1.75} />
            </Button>
          </div>
          <Button variant="ghost" size="icon-sm" asChild aria-label="Open calendar">
            <Link href={ROUTES.CALENDAR}>
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <Skeleton className="h-[180px] w-full rounded-xl" aria-label="Loading calendar" />
        ) : null}

        {isError ? (
          <div className="space-y-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm">
            <p className="text-destructive">
              {error instanceof ApiClientError
                ? error.message
                : "Could not load calendar events."}
            </p>
            <Button type="button" size="sm" variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : null}

        {!isLoading && !isError ? (
          <>
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
              {dayCells.map((day) => (
                <button
                  key={day.fullDate.toISOString()}
                  type="button"
                  className={cn(
                    "relative mx-auto flex h-8 w-8 items-center justify-center rounded-lg text-xs transition-colors",
                    !day.isCurrentMonth && "text-muted-foreground/40",
                    day.isCurrentMonth && "text-foreground hover:bg-accent/70",
                    day.isSelected && !day.isToday && "ring-1 ring-primary/40",
                    day.isToday &&
                      "bg-primary font-semibold text-primary-foreground shadow-[var(--shadow-glow-primary)] hover:bg-primary",
                  )}
                  aria-label={`${monthLabel} ${day.date}${day.hasEvent ? ", has events" : ""}${day.isToday ? ", today" : ""}`}
                  aria-current={day.isToday ? "date" : undefined}
                  role="gridcell"
                  onClick={() => {
                    setSelectedDay(day.fullDate);
                    if (day.events.length === 1) {
                      router.push(
                        `${ROUTES.CALENDAR}?open=${encodeURIComponent(day.events[0]!.id)}`,
                      );
                    }
                  }}
                >
                  {day.date}
                  {day.hasEvent && !day.isToday ? (
                    <span
                      className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary"
                      aria-hidden="true"
                    />
                  ) : null}
                </button>
              ))}
            </div>

            <div className="space-y-1.5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {selectedEvents.length
                  ? "Events"
                  : "No events on selected day"}
              </p>
              {selectedEvents.slice(0, 3).map((event) => (
                <button
                  key={event.id}
                  type="button"
                  className="flex w-full items-start gap-2 rounded-lg border border-border/40 bg-muted/10 px-2.5 py-2 text-left transition hover:bg-accent/50"
                  onClick={() =>
                    router.push(
                      `${ROUTES.CALENDAR}?open=${encodeURIComponent(event.id)}`,
                    )
                  }
                >
                  <span
                    className="mt-1 size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: event.color || "var(--primary)" }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-foreground">
                      {event.title}
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      {formatEventTime(event.startsAt, event.allDay)}
                    </span>
                  </span>
                </button>
              ))}
              {selectedEvents.length > 3 ? (
                <Link
                  href={ROUTES.CALENDAR}
                  className="block text-center text-[11px] text-primary hover:underline"
                >
                  View {selectedEvents.length - 3} more
                </Link>
              ) : null}
            </div>
          </>
        ) : null}

        {isFetching && !isLoading ? (
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Loader2 className="size-3 animate-spin" aria-hidden="true" />
            Updating…
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
