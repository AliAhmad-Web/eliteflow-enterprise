import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateTaskInput, UpdateTaskInput } from "@enterprise/shared";

import { tasksService } from "@/api/tasks.service";
import { ApiClientError } from "@/api/api-error";
import { queryKeys } from "@/api/query-keys";
import { StackHeader } from "@/components/navigation/StackHeader";
import { FilterChips } from "@/components/ui/FilterChips";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { LoadingState } from "@/components/ui/LoadingState";
import { useTheme } from "@/theme/theme.store";

const STATUS_OPTIONS = [
  { value: "TODO" as const, label: "To do" },
  { value: "IN_PROGRESS" as const, label: "Doing" },
  { value: "REVIEW" as const, label: "Review" },
  { value: "COMPLETED" as const, label: "Done" },
  { value: "BLOCKED" as const, label: "Blocked" },
];

const PRIORITY_OPTIONS = [
  { value: "LOW" as const, label: "Low" },
  { value: "MEDIUM" as const, label: "Medium" },
  { value: "HIGH" as const, label: "High" },
  { value: "CRITICAL" as const, label: "Critical" },
];

interface TaskFormScreenProps {
  mode: "create" | "edit";
  taskId?: string;
  initial?: Partial<{
    title: string;
    description: string;
    projectId: string;
    assignedToId: string;
    status: CreateTaskInput["status"];
    priority: CreateTaskInput["priority"];
    labels: string;
    dueDate: string;
    progress: string;
  }>;
}

export function TaskFormScreen({ mode, taskId, initial }: TaskFormScreenProps) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const router = useRouter();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [projectId, setProjectId] = useState(initial?.projectId ?? "");
  const [assignedToId, setAssignedToId] = useState(initial?.assignedToId ?? "");
  const [status, setStatus] = useState(initial?.status ?? "TODO");
  const [priority, setPriority] = useState(initial?.priority ?? "MEDIUM");
  const [labels, setLabels] = useState(initial?.labels ?? "");
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? "");
  const [progress, setProgress] = useState(initial?.progress ?? "0");
  const [error, setError] = useState<string | null>(null);

  const projects = useQuery({
    queryKey: queryKeys.tasks.projects,
    queryFn: () => tasksService.listProjects(),
  });

  const assignees = useQuery({
    queryKey: queryKeys.tasks.assignees,
    queryFn: () => tasksService.listAssignees(),
  });

  useEffect(() => {
    if (!projectId && projects.data?.[0]?.id) {
      setProjectId(projects.data[0].id);
    }
  }, [projectId, projects.data]);

  const mutation = useMutation({
    mutationFn: async () => {
      const labelList = labels
        .split(",")
        .map((l) => l.trim())
        .filter(Boolean);

      const payload: CreateTaskInput = {
        title: title.trim(),
        description: description.trim(),
        projectId,
        assignedToId: assignedToId || "",
        status,
        priority,
        labels: labelList,
        startDate: "",
        dueDate: dueDate.trim(),
        progress: Number(progress) || 0,
        estimatedHours: "",
        attachments: [],
      };

      if (mode === "create") {
        return tasksService.create(payload);
      }
      if (!taskId) throw new Error("Missing task id");
      return tasksService.update(taskId, payload as UpdateTaskInput);
    },
    onSuccess: async (task) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      router.replace(`/(app)/tasks/${task.id}`);
    },
    onError: (err) => {
      setError(
        err instanceof ApiClientError ? err.message : "Could not save task.",
      );
    },
  });

  if (projects.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StackHeader title={mode === "create" ? "New task" : "Edit task"} />
        <LoadingState />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StackHeader title={mode === "create" ? "New task" : "Edit task"} />
      <ScrollView
        contentContainerStyle={{
          padding: spacing[4],
          gap: spacing[4],
          paddingBottom: spacing[8],
        }}
        keyboardShouldPersistTaps="handled"
      >
        <TextField label="Title" value={title} onChangeText={setTitle} />
        <TextField
          label="Description"
          value={description}
          onChangeText={setDescription}
          multiline
          style={{ minHeight: 80, textAlignVertical: "top" }}
        />

        <View style={{ gap: spacing[2] }}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            Project
          </Text>
          <FilterChips
            options={(projects.data ?? []).map((p) => ({
              value: p.id,
              label: p.name,
            }))}
            value={projectId}
            onChange={(v) => {
              if (v) setProjectId(v);
            }}
          />
        </View>

        <View style={{ gap: spacing[2] }}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            Assignee
          </Text>
          <FilterChips
            options={[
              { value: "", label: "Unassigned" },
              ...(assignees.data ?? []).map((a) => ({
                value: a.id,
                label: `${a.firstName} ${a.lastName}`.trim(),
              })),
            ]}
            value={assignedToId}
            onChange={setAssignedToId}
          />
        </View>

        <View style={{ gap: spacing[2] }}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            Status
          </Text>
          <FilterChips
            options={STATUS_OPTIONS}
            value={status}
            onChange={(v) => {
              if (v) setStatus(v);
            }}
          />
        </View>

        <View style={{ gap: spacing[2] }}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            Priority
          </Text>
          <FilterChips
            options={PRIORITY_OPTIONS}
            value={priority}
            onChange={(v) => {
              if (v) setPriority(v);
            }}
          />
        </View>

        <TextField
          label="Labels (comma-separated)"
          value={labels}
          onChangeText={setLabels}
          autoCapitalize="none"
        />
        <TextField
          label="Due date (YYYY-MM-DD)"
          value={dueDate}
          onChangeText={setDueDate}
          placeholder="2026-07-30"
          autoCapitalize="none"
        />
        <TextField
          label="Progress (0-100)"
          value={progress}
          onChangeText={setProgress}
          keyboardType="number-pad"
        />

        {error ? <Text style={{ color: colors.destructive }}>{error}</Text> : null}

        <Button
          title={mode === "create" ? "Create task" : "Save changes"}
          loading={mutation.isPending}
          onPress={() => {
            if (!title.trim() || !projectId) {
              Alert.alert("Missing fields", "Title and project are required.");
              return;
            }
            setError(null);
            mutation.mutate();
          }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
});
