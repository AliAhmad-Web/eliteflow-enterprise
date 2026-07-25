import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { PERMISSIONS, hasPermission } from "@enterprise/shared";

import { useAuthStore } from "@/auth/auth.store";
import { useTheme } from "@/theme/theme.store";

interface QuickAction {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: string;
  permission?: string;
}

const ACTIONS: QuickAction[] = [
  {
    id: "clients",
    label: "Clients",
    icon: "people-outline",
    href: "/(app)/clients",
    permission: PERMISSIONS.CLIENTS_READ,
  },
  {
    id: "projects",
    label: "Projects",
    icon: "briefcase-outline",
    href: "/(app)/projects",
    permission: PERMISSIONS.PROJECTS_READ,
  },
  {
    id: "tasks",
    label: "Tasks",
    icon: "checkbox-outline",
    href: "/(app)/tasks",
    permission: PERMISSIONS.TASKS_READ,
  },
  {
    id: "calendar",
    label: "Calendar",
    icon: "calendar-outline",
    href: "/(app)/calendar",
    permission: PERMISSIONS.CALENDAR_READ,
  },
  {
    id: "ai",
    label: "AI",
    icon: "sparkles-outline",
    href: "/(app)/ai-assistant",
    permission: PERMISSIONS.AI_USE,
  },
  {
    id: "search",
    label: "Search",
    icon: "search-outline",
    href: "/(app)/(tabs)/search",
  },
];

export function QuickActions() {
  const theme = useTheme();
  const { colors, spacing, radius } = theme;
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const subject = user
    ? { role: user.role.code, permissions: user.permissions }
    : null;

  const visible = ACTIONS.filter((action) => {
    if (!action.permission || !subject) return !action.permission;
    return hasPermission(subject, action.permission);
  });

  return (
    <View style={[styles.grid, { gap: spacing[2] }]}>
      {visible.map((action) => (
        <Pressable
          key={action.id}
          onPress={() => router.push(action.href as never)}
          style={({ pressed }) => [
            styles.item,
            {
              backgroundColor: colors.muted,
              borderRadius: radius,
              paddingVertical: spacing[3],
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Ionicons name={action.icon} size={22} color={colors.primary} />
          <Text style={[styles.label, { color: colors.foreground }]}>
            {action.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  item: {
    width: "31%",
    flexGrow: 1,
    alignItems: "center",
    gap: 6,
    minWidth: 96,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
  },
});
