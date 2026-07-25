"use client";

import {
  CALENDAR_EVENT_CATEGORIES,
  CALENDAR_EVENT_TYPES,
  PERMISSIONS,
  type CalendarEvent,
  type CalendarEventCategoryValue,
  type CalendarEventTypeValue,
  type CalendarViewValue,
  type ListCalendarEventsQueryInput,
} from "@enterprise/shared";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Copy,
  Search,
  Trash2,
} from "lucide-react";
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type DragEvent,
} from "react";

import { EmptyState } from "@/components/common/feedback/empty-state";
import { ErrorState } from "@/components/common/feedback/error-state";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/features/auth/stores/auth.store";
import { OpenedFromNotificationBanner } from "@/features/notifications/components/opened-from-notification-banner";
import { useEntityDeepLink } from "@/features/notifications/hooks/use-entity-deep-link";
import {
  useHasPermission,
  useRole,
} from "@/features/rbac/hooks/use-permissions";
import { ApiClientError } from "@/services/api/api-error";
import { cn } from "@/lib/utils";

import {
  useCreateEvent,
  useDeleteEvent,
  useDuplicateEvent,
  useMoveEvent,
  useRespondInvitation,
  useUpdateEvent,
} from "../hooks/use-calendar-mutations";
import { useCalendarEvents, useHolidays, useUpcomingEvents } from "../hooks/use-calendar";
import {
  EVENT_CATEGORY_LABELS,
  EVENT_TYPE_LABELS,
  addDays,
  buildMonthGrid,
  endOfMonth,
  endOfWeek,
  formatEventRange,
  formatEventTime,
  sameDay,
  startOfMonth,
  startOfWeek,
} from "../types/calendar.types";
import { EventModal, type EventFormValues } from "./event-modal";

const selectClassName =
  "flex h-10 rounded-lg border border-input bg-background/80 px-3 py-2 text-sm text-foreground shadow-[var(--shadow-xs)] transition-all focus-visible:outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring/50";

const VIEW_LABELS: Record<CalendarViewValue, string> = {
  day: "Day",
  week: "Week",
  month: "Month",
  agenda: "Agenda",
};

function rangeForView(anchor: Date, view: CalendarViewValue) {
  if (view === "day") {
    const from = new Date(anchor);
    from.setHours(0, 0, 0, 0);
    const to = new Date(anchor);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }
  if (view === "week") {
    return { from: startOfWeek(anchor), to: endOfWeek(anchor) };
  }
  if (view === "agenda") {
    const from = new Date(anchor);
    from.setHours(0, 0, 0, 0);
    return { from, to: addDays(from, 30) };
  }
  const from = startOfWeek(startOfMonth(anchor));
  const to = endOfWeek(endOfMonth(anchor));
  return { from, to };
}

function eventsForDay(events: CalendarEvent[], day: Date) {
  return events.filter((event) => {
    const start = new Date(event.startsAt);
    const end = new Date(event.endsAt);
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);
    return start <= dayEnd && end >= dayStart;
  });
}

export function CalendarPageContent() {
  const { isClient, isAdmin } = useRole();
  const canWrite = useHasPermission(PERMISSIONS.CALENDAR_WRITE) && !isClient;
  const currentUserId = useAuthStore((state) => state.user?.id);

  const [anchor, setAnchor] = useState(() => new Date());
  const [view, setView] = useState<CalendarViewValue>("month");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const [typeFilter, setTypeFilter] = useState<CalendarEventTypeValue | "ALL">(
    "ALL",
  );
  const [categoryFilter, setCategoryFilter] = useState<
    CalendarEventCategoryValue | "ALL"
  >("ALL");
  const [teamOnly, setTeamOnly] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [defaultSlot, setDefaultSlot] = useState<{
    startsAt: string;
    endsAt: string;
  } | null>(null);
  const deepLink = useEntityDeepLink();

  const range = useMemo(() => rangeForView(anchor, view), [anchor, view]);

  const query: ListCalendarEventsQueryInput = useMemo(
    () => ({
      view,
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      search: deferredSearch,
      type: typeFilter === "ALL" ? undefined : typeFilter,
      category: categoryFilter === "ALL" ? undefined : categoryFilter,
      team: teamOnly ? "true" : undefined,
      page: 1,
      limit: 200,
    }),
    [view, range, deferredSearch, typeFilter, categoryFilter, teamOnly],
  );

  const eventsQuery = useCalendarEvents(query);
  const upcomingQuery = useUpcomingEvents();
  const holidaysQuery = useHolidays(
    range.from.toISOString().slice(0, 10),
    range.to.toISOString().slice(0, 10),
  );

  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();
  const duplicateEvent = useDuplicateEvent();
  const moveEvent = useMoveEvent();
  const respondInvitation = useRespondInvitation();

  const events = eventsQuery.data?.items ?? [];

  useEffect(() => {
    if (!deepLink.openId) return;
    const match = events.find((event) => event.id === deepLink.openId);
    if (!match) return;
    setEditing(match);
    setModalOpen(true);
  }, [deepLink.openId, events]);
  const holidays = holidaysQuery.data?.items ?? [];
  const monthDays = useMemo(() => buildMonthGrid(anchor), [anchor]);
  const weekDays = useMemo(() => {
    const start = startOfWeek(anchor);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [anchor]);

  const titleLabel = useMemo(() => {
    if (view === "day") {
      return anchor.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }
    if (view === "week") {
      const start = startOfWeek(anchor);
      const end = endOfWeek(anchor);
      return `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return anchor.toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });
  }, [anchor, view]);

  const openCreate = (day?: Date) => {
    if (!canWrite) return;
    const start = day ? new Date(day) : new Date();
    if (day) start.setHours(10, 0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    setEditing(null);
    setDefaultSlot({
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
    });
    setModalOpen(true);
  };

  const openEdit = (event: CalendarEvent) => {
    setEditing(event);
    setDefaultSlot(null);
    setModalOpen(true);
  };

  const handleSave = async (values: EventFormValues) => {
    try {
      if (editing) {
        await updateEvent.mutateAsync({ id: editing.id, input: values });
      } else {
        await createEvent.mutateAsync(values);
      }
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : "Failed to save event";
      throw new Error(message);
    }
  };

  const onDragStart = (event: DragEvent, calendarEvent: CalendarEvent) => {
    if (!canWrite) return;
    event.dataTransfer.setData("text/event-id", calendarEvent.id);
    event.dataTransfer.setData("text/event-duration", String(
      new Date(calendarEvent.endsAt).getTime() -
        new Date(calendarEvent.startsAt).getTime(),
    ));
    event.dataTransfer.effectAllowed = "move";
  };

  const onDropDay = async (event: DragEvent, day: Date) => {
    event.preventDefault();
    if (!canWrite) return;
    const id = event.dataTransfer.getData("text/event-id");
    const duration = Number(event.dataTransfer.getData("text/event-duration") || 3600000);
    if (!id) return;

    const source = events.find((item) => item.id === id);
    if (!source) return;

    const start = new Date(day);
    const original = new Date(source.startsAt);
    start.setHours(original.getHours(), original.getMinutes(), 0, 0);
    const end = new Date(start.getTime() + duration);

    try {
      await moveEvent.mutateAsync({
        id,
        input: {
          startsAt: start.toISOString(),
          endsAt: end.toISOString(),
        },
      });
    } catch {
      // toast omitted — error state surfaces via query refetch
    }
  };

  const navigate = (direction: -1 | 1) => {
    setAnchor((prev) => {
      const next = new Date(prev);
      if (view === "day") next.setDate(prev.getDate() + direction);
      else if (view === "week") next.setDate(prev.getDate() + direction * 7);
      else next.setMonth(prev.getMonth() + direction);
      return next;
    });
  };

  const permissionDenied =
    eventsQuery.error instanceof ApiClientError &&
    eventsQuery.error.status === 403;

  const myPendingInvite = (event: CalendarEvent) =>
    event.attendees?.find(
      (a) => a.userId === currentUserId && a.status === "PENDING",
    );

  return (
    <div className="flex flex-col gap-6">
      <OpenedFromNotificationBanner
        visible={deepLink.bannerVisible}
        onDismiss={deepLink.dismissBanner}
      />
      <PageHeader
        title="Calendar"
        description="Meetings, deadlines, reminders, and team schedule."
        actionLabel={canWrite ? "New event" : undefined}
        onAction={canWrite ? () => openCreate() : undefined}
      />

      <div className="grid gap-4 lg:gap-6 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium">
                {anchor.toLocaleDateString(undefined, {
                  month: "long",
                  year: "numeric",
                })}
              </p>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Previous month"
                  onClick={() =>
                    setAnchor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
                  }
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Next month"
                  onClick={() =>
                    setAnchor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
                  }
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground">
              {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {buildMonthGrid(anchor).map((day) => {
                const isCurrentMonth = day.getMonth() === anchor.getMonth();
                const isSelected = sameDay(day, anchor);
                const isToday = sameDay(day, new Date());
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => {
                      setAnchor(day);
                      if (view === "agenda") setView("day");
                    }}
                    className={cn(
                      "h-8 rounded-md text-xs transition-colors",
                      !isCurrentMonth && "text-muted-foreground/50",
                      isSelected && "bg-primary text-primary-foreground",
                      !isSelected && isToday && "border border-primary",
                      !isSelected && "hover:bg-muted",
                    )}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-medium">Today&apos;s schedule</h3>
            {upcomingQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : (upcomingQuery.data?.today.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No events today</p>
            ) : (
              <ul className="space-y-2">
                {upcomingQuery.data?.today.map((event) => (
                  <li key={event.occurrenceId ?? event.id}>
                    <button
                      type="button"
                      className="w-full rounded-md border-l-4 bg-muted/40 px-2 py-1.5 text-left text-sm"
                      style={{ borderLeftColor: event.color }}
                      onClick={() => openEdit(event)}
                    >
                      <p className="font-medium leading-tight">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatEventTime(event.startsAt, event.allDay)}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-medium">Upcoming</h3>
            {(upcomingQuery.data?.upcoming.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing upcoming</p>
            ) : (
              <ul className="space-y-2">
                {upcomingQuery.data?.upcoming.slice(0, 6).map((event) => (
                  <li key={event.occurrenceId ?? event.id}>
                    <button
                      type="button"
                      className="w-full text-left text-sm"
                      onClick={() => openEdit(event)}
                    >
                      <p className="font-medium">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatEventRange(event.startsAt, event.endsAt, event.allDay)}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {holidays.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-3 text-sm font-medium">Company holidays</h3>
              <ul className="space-y-2 text-sm">
                {holidays.map((holiday) => (
                  <li key={holiday.id}>
                    <p className="font-medium">{holiday.name}</p>
                    <p className="text-xs text-muted-foreground">{holiday.date}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>

        <section className="min-w-0 space-y-4">
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setAnchor(new Date())}>
                Today
              </Button>
              <Button variant="outline" size="icon" onClick={() => navigate(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <h2 className="ml-2 text-base font-semibold sm:text-lg">{titleLabel}</h2>
            </div>
            <div className="flex flex-wrap gap-1">
              {(Object.keys(VIEW_LABELS) as CalendarViewValue[]).map((key) => (
                <Button
                  key={key}
                  size="sm"
                  variant={view === key ? "default" : "outline"}
                  onClick={() => setView(key)}
                >
                  {VIEW_LABELS[key]}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search events..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className={selectClassName}
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(e.target.value as CalendarEventTypeValue | "ALL")
              }
            >
              <option value="ALL">All types</option>
              {CALENDAR_EVENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {EVENT_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
            <select
              className={selectClassName}
              value={categoryFilter}
              onChange={(e) =>
                setCategoryFilter(
                  e.target.value as CalendarEventCategoryValue | "ALL",
                )
              }
            >
              <option value="ALL">All categories</option>
              {CALENDAR_EVENT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {EVENT_CATEGORY_LABELS[category]}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm whitespace-nowrap">
              <input
                type="checkbox"
                checked={teamOnly}
                onChange={(e) => setTeamOnly(e.target.checked)}
              />
              Team schedule
            </label>
          </div>

          {eventsQuery.isLoading ? (
            <LoadingState label="Loading calendar..." />
          ) : permissionDenied ? (
            <ErrorState
              title="Permission denied"
              description="You do not have access to calendar events."
            />
          ) : eventsQuery.isError ? (
            <ErrorState
              title="Could not load calendar"
              description={
                eventsQuery.error instanceof Error
                  ? eventsQuery.error.message
                  : "Unexpected error"
              }
              onRetry={() => void eventsQuery.refetch()}
            />
          ) : events.length === 0 && view === "agenda" ? (
            <EmptyState
              icon={CalendarDays}
              title="No events"
              description="There are no events in this range."
              actionLabel={canWrite ? "Create event" : undefined}
              onAction={canWrite ? () => openCreate() : undefined}
            />
          ) : (
            <>
              {view === "month" && (
                <div className="overflow-hidden rounded-xl border border-border bg-card">
                  <div className="grid grid-cols-7 border-b border-border bg-muted/40 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                      (d) => (
                        <div key={d} className="px-2 py-2">
                          {d}
                        </div>
                      ),
                    )}
                  </div>
                  <div className="grid grid-cols-7">
                    {monthDays.map((day) => {
                      const dayEvents = eventsForDay(events, day);
                      const inMonth = day.getMonth() === anchor.getMonth();
                      return (
                        <div
                          key={day.toISOString()}
                          className={cn(
                            "min-h-28 border-b border-r border-border p-1.5",
                            !inMonth && "bg-muted/20",
                          )}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => void onDropDay(e, day)}
                          onDoubleClick={() => openCreate(day)}
                        >
                          <div className="mb-1 flex items-center justify-between">
                            <span
                              className={cn(
                                "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                                sameDay(day, new Date()) &&
                                  "bg-primary text-primary-foreground",
                                !inMonth && "text-muted-foreground",
                              )}
                            >
                              {day.getDate()}
                            </span>
                          </div>
                          <div className="space-y-1">
                            {dayEvents.slice(0, 3).map((event) => (
                              <button
                                key={event.occurrenceId ?? `${event.id}-${event.startsAt}`}
                                type="button"
                                draggable={canWrite}
                                onDragStart={(e) => onDragStart(e, event)}
                                onClick={() => openEdit(event)}
                                className="block w-full truncate rounded px-1 py-0.5 text-left text-[11px] text-white"
                                style={{ backgroundColor: event.color }}
                              >
                                {event.title}
                              </button>
                            ))}
                            {dayEvents.length > 3 && (
                              <p className="text-[10px] text-muted-foreground">
                                +{dayEvents.length - 3} more
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {view === "week" && (
                <div className="overflow-x-auto rounded-xl border border-border bg-card">
                  <div className="grid min-w-[720px] grid-cols-7">
                    {weekDays.map((day) => (
                      <div
                        key={day.toISOString()}
                        className="min-h-96 border-r border-border p-2 last:border-r-0"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => void onDropDay(e, day)}
                        onDoubleClick={() => openCreate(day)}
                      >
                        <p className="mb-2 text-sm font-medium">
                          {day.toLocaleDateString(undefined, {
                            weekday: "short",
                            day: "numeric",
                          })}
                        </p>
                        <div className="space-y-2">
                          {eventsForDay(events, day).map((event) => (
                            <button
                              key={event.occurrenceId ?? `${event.id}-${event.startsAt}`}
                              type="button"
                              draggable={canWrite}
                              onDragStart={(e) => onDragStart(e, event)}
                              onClick={() => openEdit(event)}
                              className="w-full rounded-md border-l-4 bg-muted/50 px-2 py-2 text-left text-sm"
                              style={{ borderLeftColor: event.color }}
                            >
                              <p className="font-medium">{event.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatEventTime(event.startsAt, event.allDay)}
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {view === "day" && (
                <div
                  className="rounded-xl border border-border bg-card p-4"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => void onDropDay(e, anchor)}
                >
                  {eventsForDay(events, anchor).length === 0 ? (
                    <EmptyState
                      icon={CalendarDays}
                      title="No events"
                      description="Nothing scheduled for this day."
                      actionLabel={canWrite ? "Create event" : undefined}
                      onAction={canWrite ? () => openCreate(anchor) : undefined}
                    />
                  ) : (
                    <ul className="space-y-3">
                      {eventsForDay(events, anchor).map((event) => (
                        <li
                          key={event.occurrenceId ?? `${event.id}-${event.startsAt}`}
                          className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
                          draggable={canWrite}
                          onDragStart={(e) => onDragStart(e, event)}
                        >
                          <button
                            type="button"
                            className="text-left"
                            onClick={() => openEdit(event)}
                          >
                            <div className="mb-1 flex items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: event.color }}
                              />
                              <p className="font-semibold">{event.title}</p>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {formatEventRange(
                                event.startsAt,
                                event.endsAt,
                                event.allDay,
                              )}
                            </p>
                            {event.location ? (
                              <p className="text-sm text-muted-foreground">
                                {event.location}
                              </p>
                            ) : null}
                          </button>
                          <EventActions
                            event={event}
                            canWrite={canWrite}
                            pendingInvite={Boolean(myPendingInvite(event))}
                            onEdit={() => openEdit(event)}
                            onDuplicate={() =>
                              void duplicateEvent.mutateAsync(event.id)
                            }
                            onDelete={() => void deleteEvent.mutateAsync(event.id)}
                            onRespond={(status) =>
                              void respondInvitation.mutateAsync({
                                id: event.id,
                                input: { status },
                              })
                            }
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {view === "agenda" && (
                <div className="rounded-xl border border-border bg-card p-4">
                  <ul className="divide-y divide-border">
                    {events.map((event) => (
                      <li
                        key={event.occurrenceId ?? `${event.id}-${event.startsAt}`}
                        className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <button
                          type="button"
                          className="text-left"
                          onClick={() => openEdit(event)}
                        >
                          <p className="font-semibold">{event.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatEventRange(
                              event.startsAt,
                              event.endsAt,
                              event.allDay,
                            )}{" "}
                            · {EVENT_TYPE_LABELS[event.type]}
                          </p>
                        </button>
                        <EventActions
                          event={event}
                          canWrite={canWrite}
                          pendingInvite={Boolean(myPendingInvite(event))}
                          onEdit={() => openEdit(event)}
                          onDuplicate={() =>
                            void duplicateEvent.mutateAsync(event.id)
                          }
                          onDelete={() => void deleteEvent.mutateAsync(event.id)}
                          onRespond={(status) =>
                            void respondInvitation.mutateAsync({
                              id: event.id,
                              input: { status },
                            })
                          }
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {isAdmin && (
            <p className="text-xs text-muted-foreground">
              Admin: full company calendar access enabled.
            </p>
          )}
        </section>
      </div>

      <EventModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) {
            setEditing(null);
            deepLink.clearDeepLinkParams();
          }
        }}
        initial={editing}
        defaultStartsAt={defaultSlot?.startsAt}
        defaultEndsAt={defaultSlot?.endsAt}
        onSubmit={handleSave}
        saving={createEvent.isPending || updateEvent.isPending}
        readOnly={!canWrite}
      />
    </div>
  );
}

function EventActions({
  event,
  canWrite,
  pendingInvite,
  onEdit,
  onDuplicate,
  onDelete,
  onRespond,
}: {
  event: CalendarEvent;
  canWrite: boolean;
  pendingInvite: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onRespond: (status: "ACCEPTED" | "DECLINED" | "TENTATIVE") => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {pendingInvite && (
        <>
          <Button size="sm" onClick={() => onRespond("ACCEPTED")}>
            Accept
          </Button>
          <Button size="sm" variant="outline" onClick={() => onRespond("DECLINED")}>
            Decline
          </Button>
        </>
      )}
      <Button size="sm" variant="outline" onClick={onEdit}>
        {canWrite ? "Edit" : "View"}
      </Button>
      {canWrite && (
        <>
          <Button size="sm" variant="outline" onClick={onDuplicate}>
            <Copy className="mr-1 h-3.5 w-3.5" />
            Duplicate
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={onDelete}
            aria-label={`Delete ${event.title}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </>
      )}
    </div>
  );
}
