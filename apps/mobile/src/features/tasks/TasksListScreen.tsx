import { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Task } from "@enterprise/shared";

import { tasksService } from "@/api/tasks.service";
import { queryKeys } from "@/api/query-keys";
import { StackHeader } from "@/components/navigation/StackHeader";
import { FilterChips, SortBar } from "@/components/ui/FilterChips";
import { InfiniteList } from "@/components/ui/InfiniteList";
import { TextField } from "@/components/ui/TextField";
import { TaskListItem } from "@/features/tasks/TaskListItem";
import { useInfiniteResource } from "@/hooks/useInfiniteResource";
import { usePermissions } from "@/hooks/usePermissions";
import { useSearchQuery } from "@/hooks/useSearchQuery";
import { useTheme } from "@/theme/theme.store";

const STATUS_OPTIONS = [
  { value: "" as const, label: "All" },
  { value: "TODO" as const, label: "To do" },
  { value: "IN_PROGRESS" as const, label: "Doing" },
  { value: "REVIEW" as const, label: "Review" },
  { value: "COMPLETED" as const, label: "Done" },
  { value: "BLOCKED" as const, label: "Blocked" },
];

type SortBy =
  | "title"
  | "status"
  | "priority"
  | "dueDate"
  | "progress"
  | "createdAt"
  | "updatedAt";

const SORT_CYCLE: SortBy[] = [
  "dueDate",
  "priority",
  "updatedAt",
  "title",
  "status",
  "progress",
];

export default function TasksListScreen() {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const router = useRouter();
  const perms = usePermissions();
  const queryClient = useQueryClient();
  const search = useSearchQuery();
  const [status, setStatus] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortBy>("dueDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const filters = {
    search: search.query,
    status: status || undefined,
    sortBy,
    sortOrder,
  };

  const list = useInfiniteResource<Task, typeof filters>({
    queryKey: queryKeys.tasks.list(filters),
    filters,
    enabled: perms.canReadTasks,
    fetchPage: (page, f, limit) =>
      tasksService.list({
        search: f.search ?? "",
        status: f.status as never,
        sortBy: f.sortBy as SortBy,
        sortOrder: f.sortOrder as "asc" | "desc",
        page,
        limit,
      }),
  });

  const complete = useMutation({
    mutationFn: (task: Task) =>
      tasksService.update(task.id, { status: "COMPLETED", progress: 100 }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => tasksService.remove(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StackHeader
        title="Tasks"
        subtitle="Work"
        right={
          perms.canWriteTasks ? (
            <Pressable
              hitSlop={10}
              onPress={() => router.push("/(app)/tasks/create")}
            >
              <Ionicons name="add-circle" size={28} color={colors.primary} />
            </Pressable>
          ) : null
        }
      />
      <InfiniteList
        data={list.items}
        keyExtractor={(item) => item.id}
        isLoading={list.isLoading}
        isError={list.isError}
        onRetry={() => void list.refetch()}
        isRefreshing={list.isRefetching && !list.isFetchingNextPage}
        onRefresh={() => void list.refetch()}
        hasNextPage={list.hasNextPage}
        isFetchingNextPage={list.isFetchingNextPage}
        onEndReached={() => void list.fetchNextPage()}
        emptyTitle="No tasks"
        emptyMessage="Create a task or pull to refresh."
        emptyIcon="checkbox-outline"
        ListHeaderComponent={
          <View style={{ gap: spacing[3], paddingBottom: spacing[3] }}>
            <TextField
              label="Search"
              value={search.value}
              onChangeText={search.setValue}
              placeholder="Title, labels…"
              autoCapitalize="none"
            />
            <FilterChips
              options={STATUS_OPTIONS}
              value={status}
              onChange={setStatus}
            />
            <SortBar
              label={sortBy}
              ascending={sortOrder === "asc"}
              onToggleOrder={() =>
                setSortOrder((o) => (o === "asc" ? "desc" : "asc"))
              }
              onPressSort={() => {
                const idx = SORT_CYCLE.indexOf(sortBy);
                setSortBy(SORT_CYCLE[(idx + 1) % SORT_CYCLE.length]!);
              }}
            />
          </View>
        }
        renderItem={({ item }) => (
          <TaskListItem
            task={item}
            onPress={() => router.push(`/(app)/tasks/${item.id}`)}
            onEdit={
              perms.canWriteTasks
                ? () => router.push(`/(app)/tasks/edit/${item.id}`)
                : undefined
            }
            onComplete={
              perms.canWriteTasks && item.status !== "COMPLETED"
                ? () => complete.mutate(item)
                : undefined
            }
            onDelete={
              perms.canDeleteTasks
                ? () => {
                    Alert.alert("Delete task?", item.title, [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Delete",
                        style: "destructive",
                        onPress: () => remove.mutate(item.id),
                      },
                    ]);
                  }
                : undefined
            }
          />
        )}
      />
    </View>
  );
}
