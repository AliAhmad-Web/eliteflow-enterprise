import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { clientsService } from "@/api/clients.service";
import { queryKeys } from "@/api/query-keys";
import { StackHeader } from "@/components/navigation/StackHeader";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { usePermissions } from "@/hooks/usePermissions";
import { useTheme } from "@/theme/theme.store";

export default function PipelineScreen() {
  const theme = useTheme();
  const { colors, spacing, radius } = theme;
  const router = useRouter();
  const perms = usePermissions();

  const board = useQuery({
    queryKey: queryKeys.clients.pipeline,
    queryFn: () => clientsService.getPipelineBoard(),
    enabled: perms.canReadClients,
  });

  if (!perms.canReadClients) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StackHeader title="Pipeline" />
        <Text style={{ padding: spacing[4], color: colors.mutedForeground }}>
          You do not have permission to view the CRM pipeline.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StackHeader
        title="Pipeline"
        subtitle={
          board.data ? `${board.data.total} clients` : "CRM stages"
        }
      />
      <ScrollView
        contentContainerStyle={{ padding: spacing[4], gap: spacing[4] }}
      >
        {board.isLoading ? <LoadingState message="Loading pipeline…" /> : null}
        {board.isError ? (
          <ErrorState
            message="Could not load pipeline."
            onRetry={() => void board.refetch()}
          />
        ) : null}
        {board.data?.columns.map((col) => (
          <View
            key={col.stage}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radius,
              backgroundColor: colors.card,
              padding: spacing[3],
              gap: spacing[2],
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text style={{ color: colors.foreground, fontWeight: "700" }}>
                {col.stage}
              </Text>
              <StatusBadge label={String(col.count)} />
            </View>
            {col.clients.slice(0, 8).map((client) => (
              <Pressable
                key={client.id}
                onPress={() => router.push(`/(app)/clients/${client.id}`)}
              >
                <Text style={{ color: colors.foreground }}>
                  {client.companyName}
                </Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                  {client.contactName}
                </Text>
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
