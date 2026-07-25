import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/theme/theme.store";
import { EmptyState } from "@/components/ui/EmptyState";

interface CalendarPreviewProps {
  events: Array<{
    id: string;
    title: string;
    startsAt?: string;
    startAt?: string;
  }>;
}

function formatWhen(iso?: string): string {
  if (!iso) return "Upcoming";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "Upcoming";
  }
}

export function CalendarPreview({ events }: CalendarPreviewProps) {
  const theme = useTheme();
  const { colors, spacing, radius } = theme;

  if (!events.length) {
    return (
      <EmptyState
        icon="calendar-outline"
        title="No upcoming events"
        message="Your calendar is clear for now."
      />
    );
  }

  return (
    <View style={{ gap: spacing[2] }}>
      {events.slice(0, 4).map((event) => (
        <View
          key={event.id}
          style={[
            styles.row,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: radius,
              padding: spacing[3],
            },
          ]}
        >
          <View style={[styles.icon, { backgroundColor: colors.muted }]}>
            <Ionicons name="calendar" size={16} color={colors.primary} />
          </View>
          <View style={styles.meta}>
            <Text
              numberOfLines={1}
              style={[styles.title, { color: colors.foreground }]}
            >
              {event.title}
            </Text>
            <Text style={[styles.when, { color: colors.mutedForeground }]}>
              {formatWhen(event.startsAt ?? event.startAt)}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  meta: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
  },
  when: {
    fontSize: 12,
    marginTop: 2,
  },
});
