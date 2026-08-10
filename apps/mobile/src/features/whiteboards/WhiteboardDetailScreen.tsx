import { ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/api/query-keys";
import { whiteboardsService } from "@/api/whiteboards.service";
import { StackHeader } from "@/components/navigation/StackHeader";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { usePermissions } from "@/hooks/usePermissions";
import { useTheme } from "@/theme/theme.store";

export default function WhiteboardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { colors, spacing, radius } = theme;
  const router = useRouter();
  const perms = usePermissions();

  const query = useQuery({
    queryKey: queryKeys.whiteboards.detail(id!),
    queryFn: () => whiteboardsService.getById(id!),
    enabled: Boolean(id) && perms.canReadWhiteboards,
  });

  if (!perms.canReadWhiteboards) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StackHeader title="Whiteboard" onBack={() => router.back()} />
        <Text style={{ padding: spacing[4], color: colors.mutedForeground }}>
          Permission denied.
        </Text>
      </View>
    );
  }

  if (query.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StackHeader title="Whiteboard" onBack={() => router.back()} />
        <LoadingState message="Loading whiteboard…" />
      </View>
    );
  }

  if (query.isError || !query.data) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StackHeader title="Whiteboard" onBack={() => router.back()} />
        <ErrorState
          message="Whiteboard not found or inaccessible."
          onRetry={() => void query.refetch()}
        />
      </View>
    );
  }

  const board = query.data;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StackHeader
        title={board.title}
        subtitle={`v${board.version}`}
        onBack={() => router.back()}
      />
      <ScrollView
        contentContainerStyle={{ padding: spacing[4], gap: spacing[3] }}
      >
        <View
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius,
            backgroundColor: colors.card,
            padding: spacing[4],
            gap: spacing[2],
          }}
        >
          <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
            Live collaborative editing is not available on mobile. This view
            shows metadata only — canvas editing remains on web.
          </Text>
          <Text style={{ color: colors.foreground }}>
            Project: {board.projectId ?? "—"}
          </Text>
          <Text style={{ color: colors.foreground }}>
            Task: {board.taskId ?? "—"}
          </Text>
          <Text style={{ color: colors.foreground }}>
            Client: {board.clientId ?? "—"}
          </Text>
          <Text style={{ color: colors.mutedForeground }}>
            Updated: {board.updatedAt}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
