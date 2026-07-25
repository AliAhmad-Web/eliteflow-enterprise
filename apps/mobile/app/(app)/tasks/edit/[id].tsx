import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { tasksService } from "@/api/tasks.service";
import { queryKeys } from "@/api/query-keys";
import { TaskFormScreen } from "@/features/tasks/TaskFormScreen";
import { LoadingState } from "@/components/ui/LoadingState";
import { useTheme } from "@/theme/theme.store";

export default function EditTaskRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const detail = useQuery({
    queryKey: queryKeys.tasks.detail(id!),
    queryFn: () => tasksService.getById(id!),
    enabled: Boolean(id),
  });

  if (detail.isLoading || !detail.data) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <LoadingState />
      </View>
    );
  }

  const t = detail.data;
  return (
    <TaskFormScreen
      mode="edit"
      taskId={t.id}
      initial={{
        title: t.title,
        description: t.description ?? "",
        projectId: t.projectId ?? "",
        assignedToId: t.assignedToId ?? "",
        status: t.status,
        priority: t.priority,
        labels: (t.labels ?? []).join(", "),
        dueDate: t.dueDate ? t.dueDate.slice(0, 10) : "",
        progress: String(t.progress ?? 0),
      }}
    />
  );
}
