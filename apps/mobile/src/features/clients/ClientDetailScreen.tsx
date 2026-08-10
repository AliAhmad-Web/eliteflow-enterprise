import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";

import { clientsService } from "@/api/clients.service";
import { queryKeys } from "@/api/query-keys";
import { ApiClientError } from "@/api/api-error";
import { StackHeader } from "@/components/navigation/StackHeader";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TextField } from "@/components/ui/TextField";
import { usePermissions } from "@/hooks/usePermissions";
import { formatDate } from "@/lib/utils";
import { useTheme } from "@/theme/theme.store";

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { colors, spacing, radius } = theme;
  const router = useRouter();
  const perms = usePermissions();
  const queryClient = useQueryClient();
  const [activityTitle, setActivityTitle] = useState("");

  const detail = useQuery({
    queryKey: queryKeys.clients.detail(id!),
    queryFn: () => clientsService.getById(id!),
    enabled: Boolean(id),
  });

  const activities = useQuery({
    queryKey: queryKeys.clients.activities(id!),
    queryFn: () => clientsService.listActivities(id!, { page: 1, limit: 20 }),
    enabled: Boolean(id) && perms.canReadClients,
  });

  const remove = useMutation({
    mutationFn: () => clientsService.remove(id!),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
      router.replace("/(app)/clients");
    },
  });

  const createActivity = useMutation({
    mutationFn: () =>
      clientsService.createActivity(id!, {
        type: "NOTE",
        title: activityTitle.trim(),
      }),
    onSuccess: () => {
      setActivityTitle("");
      void queryClient.invalidateQueries({
        queryKey: queryKeys.clients.activities(id!),
      });
    },
    onError: (err) => {
      Alert.alert(
        "Unable to add activity",
        err instanceof ApiClientError ? err.message : "Please try again.",
      );
    },
  });

  const deleteActivity = useMutation({
    mutationFn: (activityId: string) =>
      clientsService.deleteActivity(id!, activityId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.clients.activities(id!),
      });
    },
  });

  const client = detail.data;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StackHeader
        title={client?.companyName ?? "Client"}
        subtitle="Profile"
        right={
          perms.canWriteClients && client ? (
            <Pressable
              hitSlop={10}
              onPress={() => router.push(`/(app)/clients/edit/${client.id}`)}
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
            message="Could not load client."
            onRetry={() => void detail.refetch()}
          />
        </View>
      ) : null}

      {client ? (
        <ScrollView
          contentContainerStyle={{
            padding: spacing[4],
            gap: spacing[4],
            paddingBottom: spacing[8],
          }}
        >
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: radius,
                padding: spacing[4],
                gap: spacing[2],
              },
            ]}
          >
            <StatusBadge
              label={client.status}
              tone={
                client.status === "ACTIVE"
                  ? "success"
                  : client.status === "LEAD"
                    ? "info"
                    : "default"
              }
            />
            <Text style={[styles.name, { color: colors.foreground }]}>
              {client.companyName}
            </Text>
            <Text style={{ color: colors.mutedForeground }}>
              {client.contactName}
            </Text>
          </View>

          <Field label="Email" value={client.email} colors={colors} />
          <Field label="Phone" value={client.phone || "—"} colors={colors} />
          <Field label="Website" value={client.website || "—"} colors={colors} />
          <Field
            label="Address"
            value={
              [client.addressLine1, client.city, client.country]
                .filter(Boolean)
                .join(", ") || "—"
            }
            colors={colors}
          />
          <Field label="Notes" value={client.notes || "—"} colors={colors} />
          <Field
            label="Updated"
            value={formatDate(client.updatedAt)}
            colors={colors}
          />
          <Field
            label="Pipeline stage"
            value={client.pipelineStage || "—"}
            colors={colors}
          />

          <Text style={[styles.name, { color: colors.foreground, fontSize: 17 }]}>
            Activities
          </Text>
          {activities.isLoading ? (
            <LoadingState message="Loading activities…" />
          ) : null}
          {activities.data?.items.map((activity) => (
            <View
              key={activity.id}
              style={[
                styles.field,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  gap: 6,
                },
              ]}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <StatusBadge label={activity.type} />
                {perms.canWriteClients ? (
                  <Pressable
                    hitSlop={8}
                    onPress={() =>
                      Alert.alert("Delete activity?", activity.title, [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Delete",
                          style: "destructive",
                          onPress: () => deleteActivity.mutate(activity.id),
                        },
                      ])
                    }
                  >
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color={colors.destructive}
                    />
                  </Pressable>
                ) : null}
              </View>
              <Text style={{ color: colors.foreground, fontWeight: "600" }}>
                {activity.title}
              </Text>
              {activity.body ? (
                <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
                  {activity.body}
                </Text>
              ) : null}
            </View>
          ))}

          {perms.canWriteClients ? (
            <View style={{ gap: spacing[2] }}>
              <TextField
                label="New activity"
                value={activityTitle}
                onChangeText={setActivityTitle}
                placeholder="Call summary, note, follow-up…"
              />
              <Button
                title="Add activity"
                loading={createActivity.isPending}
                disabled={!activityTitle.trim()}
                onPress={() => createActivity.mutate()}
              />
            </View>
          ) : null}

          {perms.canDeleteClients ? (
            <Button
              title="Delete client"
              variant="destructive"
              loading={remove.isPending}
              onPress={() => {
                Alert.alert(
                  "Delete client?",
                  "This cannot be undone.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: () => remove.mutate(),
                    },
                  ],
                );
              }}
            />
          ) : null}
        </ScrollView>
      ) : null}
    </View>
  );
}

function Field({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: { mutedForeground: string; foreground: string; card: string; border: string };
}) {
  return (
    <View
      style={[
        styles.field,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: colors.foreground, marginTop: 4, fontSize: 15 }}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
  },
  name: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  field: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
});
