import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Project } from "@enterprise/shared";

import { ProgressBar, StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/utils";
import { useTheme } from "@/theme/theme.store";

function projectTone(status: string) {
  if (status === "COMPLETED") return "success" as const;
  if (status === "IN_PROGRESS") return "info" as const;
  if (status === "ON_HOLD") return "warning" as const;
  if (status === "CANCELLED") return "danger" as const;
  return "default" as const;
}

interface ProjectListItemProps {
  project: Project;
  onPress: () => void;
}

export const ProjectListItem = memo(function ProjectListItem({
  project,
  onPress,
}: ProjectListItemProps) {
  const theme = useTheme();
  const { colors, spacing, radius } = theme;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: radius,
          padding: spacing[4],
          marginBottom: spacing[2],
          opacity: pressed ? 0.92 : 1,
          gap: spacing[2],
        },
      ]}
    >
      <View style={styles.top}>
        <Text
          numberOfLines={1}
          style={[styles.name, { color: colors.foreground, flex: 1 }]}
        >
          {project.name}
        </Text>
        <StatusBadge label={project.status} tone={projectTone(project.status)} />
      </View>
      <Text style={{ color: colors.mutedForeground, fontSize: 13 }} numberOfLines={1}>
        {project.clientName || "No client"} · {project.priority}
      </Text>
      <ProgressBar value={project.progress} />
      <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
        Due {formatDate(project.dueDate)} · {project.progress}%
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: { borderWidth: 1 },
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  name: { fontSize: 16, fontWeight: "700" },
});
