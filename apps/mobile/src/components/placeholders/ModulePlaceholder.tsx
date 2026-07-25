import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { AppHeader } from "@/components/navigation/AppHeader";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { useTheme } from "@/theme/theme.store";

interface ModulePlaceholderProps {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  apiHint: string;
}

function ModulePlaceholder({
  title,
  subtitle,
  icon,
  apiHint,
}: ModulePlaceholderProps) {
  const theme = useTheme();
  const { colors, spacing, radius } = theme;
  const router = useRouter();

  return (
    <Screen padded={false}>
      <View style={{ paddingHorizontal: spacing[4], gap: spacing[5] }}>
        <AppHeader title={title} subtitle={subtitle} />
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: radius,
              padding: spacing[5],
              alignItems: "center",
              gap: spacing[3],
            },
          ]}
        >
          <Ionicons name={icon} size={40} color={colors.primary} />
          <Text style={[styles.title, { color: colors.foreground }]}>
            Coming in M2
          </Text>
          <Text
            style={{
              color: colors.mutedForeground,
              textAlign: "center",
              lineHeight: 20,
            }}
          >
            Full {title.toLowerCase()} lists, filters, and detail flows will use{" "}
            {apiHint} — the same APIs as the web client.
          </Text>
        </View>
        <Button
          title="Back to dashboard"
          variant="secondary"
          onPress={() => router.push("/(app)/(tabs)")}
        />
      </View>
    </Screen>
  );
}

export function ProjectsPlaceholder() {
  return (
    <ModulePlaceholder
      title="Projects"
      subtitle="Portfolio"
      icon="briefcase-outline"
      apiHint="/api/v1/projects"
    />
  );
}

export function TasksPlaceholder() {
  return (
    <ModulePlaceholder
      title="Tasks"
      subtitle="Work items"
      icon="checkbox-outline"
      apiHint="/api/v1/tasks"
    />
  );
}

export function CalendarPlaceholder() {
  return (
    <ModulePlaceholder
      title="Calendar"
      subtitle="Schedule"
      icon="calendar-outline"
      apiHint="/api/v1/calendar"
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
});
