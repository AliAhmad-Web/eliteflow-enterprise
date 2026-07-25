import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Task } from "@enterprise/shared";

import { ProgressBar, StatusBadge } from "@/components/ui/StatusBadge";
import { SwipeableRow } from "@/components/ui/SwipeableRow";
import { formatDate } from "@/lib/utils";
import { useTheme } from "@/theme/theme.store";

function taskTone(status: string) {
  if (status === "COMPLETED") return "success" as const;
  if (status === "BLOCKED") return "danger" as const;
  if (status === "IN_PROGRESS" || status === "REVIEW") return "info" as const;
  return "default" as const;
}

interface TaskListItemProps {
  task: Task;
  onPress: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onComplete?: () => void;
}

export const TaskListItem = memo(function TaskListItem({
  task,
  onPress,
  onEdit,
  onDelete,
  onComplete,
}: TaskListItemProps) {
  const theme = useTheme();
  const { colors, spacing, radius } = theme;

  return (
    <SwipeableRow onEdit={onEdit} onDelete={onDelete} onComplete={onComplete}>
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
            style={[styles.title, { color: colors.foreground, flex: 1 }]}
          >
            {task.title}
          </Text>
          <StatusBadge label={task.status} tone={taskTone(task.status)} />
        </View>
        <Text style={{ color: colors.mutedForeground, fontSize: 13 }} numberOfLines={1}>
          {task.projectName || "No project"} · {task.priority}
          {task.assignedTo
            ? ` · ${task.assignedTo.firstName} ${task.assignedTo.lastName}`
            : ""}
        </Text>
        {task.labels?.length ? (
          <Text style={{ color: colors.primary, fontSize: 12 }} numberOfLines={1}>
            {task.labels.join(" · ")}
          </Text>
        ) : null}
        <ProgressBar value={task.progress} />
        <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
          Due {formatDate(task.dueDate)} · {task.progress}%
        </Text>
      </Pressable>
    </SwipeableRow>
  );
});

const styles = StyleSheet.create({
  card: { borderWidth: 1 },
  top: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 16, fontWeight: "700" },
});
