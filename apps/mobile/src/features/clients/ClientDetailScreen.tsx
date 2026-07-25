import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";

import { clientsService } from "@/api/clients.service";
import { queryKeys } from "@/api/query-keys";
import { StackHeader } from "@/components/navigation/StackHeader";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { StatusBadge } from "@/components/ui/StatusBadge";
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

  const detail = useQuery({
    queryKey: queryKeys.clients.detail(id!),
    queryFn: () => clientsService.getById(id!),
    enabled: Boolean(id),
  });

  const remove = useMutation({
    mutationFn: () => clientsService.remove(id!),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
      router.replace("/(app)/clients");
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
