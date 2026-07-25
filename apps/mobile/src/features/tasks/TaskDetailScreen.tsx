import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";

import { tasksService } from "@/api/tasks.service";
import { ApiClientError } from "@/api/api-error";
import { queryKeys } from "@/api/query-keys";
import { StackHeader } from "@/components/navigation/StackHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { ProgressBar, StatusBadge } from "@/components/ui/StatusBadge";
import { TextField } from "@/components/ui/TextField";
import { usePermissions } from "@/hooks/usePermissions";
import { formatDate, formatDateTime } from "@/lib/utils";
import { useTheme } from "@/theme/theme.store";

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { colors, spacing, radius } = theme;
  const router = useRouter();
  const perms = usePermissions();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");

  const detail = useQuery({
    queryKey: queryKeys.tasks.detail(id!),
    queryFn: () => tasksService.getById(id!),
    enabled: Boolean(id),
  });

  const activity = useQuery({
    queryKey: queryKeys.tasks.activity(id!),
    queryFn: () => tasksService.getActivity(id!),
    enabled: Boolean(id),
  });

  const addComment = useMutation({
    mutationFn: () => tasksService.addComment(id!, { body: comment.trim() }),
    onSuccess: async () => {
      setComment("");
      await queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.detail(id!),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.activity(id!),
      });
    },
    onError: (err) => {
      Alert.alert(
        "Comment failed",
        err instanceof ApiClientError ? err.message : "Try again.",
      );
    },
  });

  const task = detail.data;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StackHeader
        title={task?.title ?? "Task"}
        subtitle={task?.projectName ?? "Details"}
        right={
          perms.canWriteTasks && task ? (
            <Pressable
              hitSlop={10}
              onPress={() => router.push(`/(app)/tasks/edit/${task.id}`)}
            >
              <Ionicons name="create-outline" size={22} color={colors.primary} />
            </Pressable>
          ) : null
        }
      />

      {detail.isLoading ? <LoadingState /> : null}
      {detail.isError ? (
        <View style={{ padding: spacing[4] }}>
          <ErrorState
            message="Could not load task."
            onRetry={() => void detail.refetch()}
          />
        </View>
      ) : null}

      {task ? (
        <ScrollView
          contentContainerStyle={{
            padding: spacing[4],
            gap: spacing[5],
            paddingBottom: spacing[8],
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: radius,
                padding: spacing[4],
                gap: spacing[3],
              },
            ]}
          >
            <View style={styles.row}>
              <StatusBadge label={task.status} tone="info" />
              <StatusBadge label={task.priority} tone="warning" />
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>
              {task.title}
            </Text>
            {task.description ? (
              <Text style={{ color: colors.mutedForeground, lineHeight: 20 }}>
                {task.description}
              </Text>
            ) : null}
            <ProgressBar value={task.progress} />
            <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
              {task.progress}% · Due {formatDate(task.dueDate)}
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
              Assignee:{" "}
              {task.assignedTo
                ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}`
                : "Unassigned"}
            </Text>
            {task.labels?.length ? (
              <Text style={{ color: colors.primary, fontSize: 13 }}>
                {task.labels.join(" · ")}
              </Text>
            ) : null}
          </View>

          <View style={{ gap: spacing[3] }}>
            <Text style={[styles.section, { color: colors.foreground }]}>
              Comments
            </Text>
            {task.comments?.length ? (
              task.comments.map((c) => (
                <View
                  key={c.id}
                  style={[
                    styles.comment,
                    {
                      backgroundColor: colors.muted,
                      borderRadius: radius - 2,
                      padding: spacing[3],
                    },
                  ]}
                >
                  <Text style={{ color: colors.foreground, fontWeight: "700" }}>
                    {c.authorFirstName} {c.authorLastName}
                  </Text>
                  <Text style={{ color: colors.foreground, marginTop: 4 }}>
                    {c.body}
                  </Text>
                  <Text
                    style={{
                      color: colors.mutedForeground,
                      fontSize: 11,
                      marginTop: 6,
                    }}
                  >
                    {formatDateTime(c.createdAt)}
                  </Text>
                </View>
              ))
            ) : (
              <EmptyState
                icon="chatbubble-outline"
                title="No comments"
                message="Start the thread below."
              />
            )}

            {perms.canWriteTasks ? (
              <View style={{ gap: spacing[2] }}>
                <TextField
                  label="Add comment"
                  value={comment}
                  onChangeText={setComment}
                  multiline
                  style={{ minHeight: 80, textAlignVertical: "top" }}
                />
                <Button
                  title="Post comment"
                  loading={addComment.isPending}
                  disabled={!comment.trim()}
                  onPress={() => addComment.mutate()}
                />
              </View>
            ) : null}
          </View>

          <View style={{ gap: spacing[3] }}>
            <Text style={[styles.section, { color: colors.foreground }]}>
              Activity
            </Text>
            {activity.isLoading ? <LoadingState message="Loading activity…" /> : null}
            {activity.data?.length ? (
              activity.data.map((a) => (
                <View key={a.id} style={{ gap: 2, marginBottom: 8 }}>
                  <Text style={{ color: colors.foreground, fontWeight: "600" }}>
                    {a.message || a.action}
                  </Text>
                  <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                    {a.actorFirstName} {a.actorLastName} ·{" "}
                    {formatDateTime(a.createdAt)}
                  </Text>
                </View>
              ))
            ) : !activity.isLoading ? (
              <EmptyState
                icon="pulse-outline"
                title="No activity yet"
                message="Updates will appear as the task changes."
              />
            ) : null}
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1 },
  row: { flexDirection: "row", gap: 8 },
  title: { fontSize: 22, fontWeight: "800", letterSpacing: -0.4 },
  section: { fontSize: 17, fontWeight: "700" },
  comment: {},
});
