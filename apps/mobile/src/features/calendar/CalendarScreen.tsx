import { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import type { CalendarEvent } from "@enterprise/shared";

import { calendarService } from "@/api/calendar.service";
import { queryKeys } from "@/api/query-keys";
import { ApiClientError } from "@/api/api-error";
import { StackHeader } from "@/components/navigation/StackHeader";
import { FilterChips } from "@/components/ui/FilterChips";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { usePermissions } from "@/hooks/usePermissions";
import {
  addDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  formatDateTime,
  isSameDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "@/lib/utils";
import { useTheme } from "@/theme/theme.store";

type CalView = "month" | "week" | "day";

const VIEW_OPTIONS = [
  { value: "month" as const, label: "Month" },
  { value: "week" as const, label: "Week" },
  { value: "day" as const, label: "Day" },
];

function eventTone(type: string) {
  if (type === "MEETING") return "info" as const;
  if (type === "PROJECT_DEADLINE" || type === "TASK_DUE") return "warning" as const;
  if (type === "HOLIDAY") return "success" as const;
  return "default" as const;
}

export default function CalendarScreen() {
  const theme = useTheme();
  const { colors, spacing, radius } = theme;
  const perms = usePermissions();
  const router = useRouter();
  const qc = useQueryClient();
  const [view, setView] = useState<CalView>("month");
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));

  const remove = useMutation({
    mutationFn: (id: string) => calendarService.deleteEvent(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.calendar.all });
    },
    onError: (err) => {
      Alert.alert(
        "Unable to delete",
        err instanceof ApiClientError ? err.message : "Please try again.",
      );
    },
  });

  const range = useMemo(() => {
    if (view === "day") {
      return { from: startOfDay(cursor), to: endOfDay(cursor) };
    }
    if (view === "week") {
      return { from: startOfWeek(cursor), to: endOfWeek(cursor) };
    }
    return { from: startOfMonth(cursor), to: endOfMonth(cursor) };
  }, [view, cursor]);

  const filters = {
    view,
    from: range.from.toISOString(),
    to: range.to.toISOString(),
  };

  const eventsQuery = useQuery({
    queryKey: queryKeys.calendar.events(filters),
    queryFn: () =>
      calendarService.listEvents({
        view,
        from: filters.from,
        to: filters.to,
        page: 1,
        limit: 200,
        search: "",
      }),
    enabled: perms.canReadCalendar,
  });

  const events = eventsQuery.data?.items ?? [];

  const monthDays = useMemo(() => {
    if (view !== "month") return [];
    const start = startOfWeek(startOfMonth(cursor));
    const end = endOfWeek(endOfMonth(cursor));
    const days: Date[] = [];
    for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
      days.push(new Date(d));
    }
    return days;
  }, [view, cursor]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const key = startOfDay(new Date(ev.startsAt)).toDateString();
      const list = map.get(key) ?? [];
      list.push(ev);
      map.set(key, list);
    }
    return map;
  }, [events]);

  const visibleEvents = useMemo(() => {
    if (view === "month") {
      const key = cursor.toDateString();
      return eventsByDay.get(key) ?? [];
    }
    return [...events].sort(
      (a, b) =>
        new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );
  }, [view, cursor, events, eventsByDay]);

  const title =
    view === "day"
      ? cursor.toLocaleDateString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
        })
      : view === "week"
        ? `Week of ${startOfWeek(cursor).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
        : cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  function shift(delta: number) {
    if (view === "day") setCursor((c) => addDays(c, delta));
    else if (view === "week") setCursor((c) => addDays(c, delta * 7));
    else setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StackHeader
        title="Calendar"
        subtitle={title}
        right={
          perms.canWriteCalendar ? (
            <Pressable
              hitSlop={10}
              onPress={() => router.push("/(app)/calendar/create")}
            >
              <Text style={{ color: colors.primary, fontWeight: "700" }}>
                New
              </Text>
            </Pressable>
          ) : null
        }
      />

      <ScrollView
        contentContainerStyle={{
          padding: spacing[4],
          gap: spacing[4],
          paddingBottom: spacing[8],
        }}
      >
        <FilterChips options={VIEW_OPTIONS} value={view} onChange={(v) => v && setView(v)} />

        <View style={styles.navRow}>
          <Pressable onPress={() => shift(-1)} hitSlop={10}>
            <Text style={{ color: colors.primary, fontWeight: "700" }}>Prev</Text>
          </Pressable>
          <Pressable onPress={() => setCursor(startOfDay(new Date()))} hitSlop={10}>
            <Text style={{ color: colors.foreground, fontWeight: "600" }}>Today</Text>
          </Pressable>
          <Pressable onPress={() => shift(1)} hitSlop={10}>
            <Text style={{ color: colors.primary, fontWeight: "700" }}>Next</Text>
          </Pressable>
        </View>

        {eventsQuery.isLoading ? <ListSkeleton rows={4} /> : null}
        {eventsQuery.isError ? (
          <ErrorState
            message="Could not load calendar."
            onRetry={() => void eventsQuery.refetch()}
          />
        ) : null}

        {view === "month" && !eventsQuery.isLoading ? (
          <View
            style={[
              styles.monthGrid,
              {
                borderColor: colors.border,
                backgroundColor: colors.card,
                borderRadius: radius,
              },
            ]}
          >
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <Text
                key={`${d}-${i}`}
                style={[styles.dow, { color: colors.mutedForeground }]}
              >
                {d}
              </Text>
            ))}
            {monthDays.map((day) => {
              const inMonth = day.getMonth() === cursor.getMonth();
              const selected = isSameDay(day, cursor);
              const hasEvents = (eventsByDay.get(day.toDateString())?.length ?? 0) > 0;
              return (
                <Pressable
                  key={day.toISOString()}
                  onPress={() => setCursor(startOfDay(day))}
                  style={[
                    styles.dayCell,
                    selected && { backgroundColor: colors.primary },
                  ]}
                >
                  <Text
                    style={{
                      color: selected
                        ? colors.primaryForeground
                        : inMonth
                          ? colors.foreground
                          : colors.mutedForeground,
                      fontWeight: selected || hasEvents ? "700" : "500",
                      fontSize: 13,
                    }}
                  >
                    {day.getDate()}
                  </Text>
                  {hasEvents ? (
                    <View
                      style={[
                        styles.dot,
                        {
                          backgroundColor: selected
                            ? colors.primaryForeground
                            : colors.primary,
                        },
                      ]}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {view === "week" && !eventsQuery.isLoading ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: "row", gap: spacing[2] }}>
              {Array.from({ length: 7 }).map((_, i) => {
                const day = addDays(startOfWeek(cursor), i);
                const selected = isSameDay(day, cursor);
                const count = eventsByDay.get(day.toDateString())?.length ?? 0;
                return (
                  <Pressable
                    key={day.toISOString()}
                    onPress={() => setCursor(startOfDay(day))}
                    style={[
                      styles.weekChip,
                      {
                        backgroundColor: selected ? colors.primary : colors.muted,
                        borderRadius: radius,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: selected
                          ? colors.primaryForeground
                          : colors.mutedForeground,
                        fontSize: 11,
                      }}
                    >
                      {day.toLocaleDateString(undefined, { weekday: "short" })}
                    </Text>
                    <Text
                      style={{
                        color: selected
                          ? colors.primaryForeground
                          : colors.foreground,
                        fontWeight: "700",
                        fontSize: 18,
                      }}
                    >
                      {day.getDate()}
                    </Text>
                    <Text
                      style={{
                        color: selected
                          ? colors.primaryForeground
                          : colors.mutedForeground,
                        fontSize: 11,
                      }}
                    >
                      {count} evt
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        ) : null}

        <Text style={[styles.section, { color: colors.foreground }]}>
          {view === "month" ? "Selected day" : "Events"}
        </Text>

        {visibleEvents.length === 0 && !eventsQuery.isLoading ? (
          <EmptyState
            icon="calendar-outline"
            title="No events"
            message="Meetings, deadlines, and reminders will appear here."
          />
        ) : (
          visibleEvents.map((ev) => (
            <Pressable
              key={ev.id}
              onLongPress={() => {
                if (!perms.canWriteCalendar) return;
                Alert.alert("Delete event?", ev.title, [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => remove.mutate(ev.id),
                  },
                ]);
              }}
              style={[
                styles.event,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: radius,
                  padding: spacing[4],
                },
              ]}
            >
              <View style={styles.row}>
                <StatusBadge label={ev.type} tone={eventTone(ev.type)} />
                <StatusBadge label={ev.status} />
              </View>
              <Text
                style={{
                  color: colors.foreground,
                  fontWeight: "700",
                  fontSize: 16,
                  marginTop: 8,
                }}
              >
                {ev.title}
              </Text>
              <Text style={{ color: colors.mutedForeground, marginTop: 4, fontSize: 13 }}>
                {formatDateTime(ev.startsAt)}
                {ev.location ? ` · ${ev.location}` : ""}
              </Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderWidth: 1,
    padding: 8,
  },
  dow: {
    width: `${100 / 7}%`,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 6,
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  weekChip: {
    width: 72,
    paddingVertical: 12,
    alignItems: "center",
    gap: 4,
  },
  section: { fontSize: 17, fontWeight: "700" },
  event: { borderWidth: 1, marginBottom: 8 },
  row: { flexDirection: "row", gap: 8 },
});
