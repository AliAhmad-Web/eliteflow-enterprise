import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import type { WhiteboardListItem } from "@enterprise/shared";

import { queryKeys } from "@/api/query-keys";
import { whiteboardsService } from "@/api/whiteboards.service";
import { StackHeader } from "@/components/navigation/StackHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { usePermissions } from "@/hooks/usePermissions";
import { useTheme } from "@/theme/theme.store";

export default function WhiteboardsListScreen() {
  const theme = useTheme();
  const { colors, spacing, radius } = theme;
  const router = useRouter();
  const perms = usePermissions();

  const list = useQuery({
    queryKey: queryKeys.whiteboards.list({ page: 1 }),
    queryFn: () =>
      whiteboardsService.list({
        page: 1,
        limit: 50,
        search: "",
      }),
    enabled: perms.canReadWhiteboards,
  });

  if (!perms.canReadWhiteboards) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StackHeader title="Whiteboards" />
        <Text style={{ padding: spacing[4], color: colors.mutedForeground }}>
          You do not have permission to view whiteboards.
        </Text>
      </View>
    );
  }

  const items = list.data?.items ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StackHeader
        title="Whiteboards"
        subtitle="Read-only · no live collaboration"
      />
      <ScrollView
        contentContainerStyle={{ padding: spacing[4], gap: spacing[3] }}
      >
        {list.isLoading ? (
          <LoadingState message="Loading whiteboards…" />
        ) : null}
        {list.isError ? (
          <ErrorState
            message="Could not load whiteboards."
            onRetry={() => void list.refetch()}
          />
        ) : null}
        {!list.isLoading && !list.isError && items.length === 0 ? (
          <EmptyState
            icon="easel-outline"
            title="No whiteboards"
            message="Company-scoped boards will appear here."
          />
        ) : null}
        {items.map((item: WhiteboardListItem) => (
          <Pressable
            key={item.id}
            onPress={() => router.push(`/(app)/whiteboards/${item.id}`)}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radius,
              backgroundColor: colors.card,
              padding: spacing[4],
            }}
          >
            <Text style={{ color: colors.foreground, fontWeight: "700" }}>
              {item.title}
            </Text>
            <Text style={{ color: colors.mutedForeground, marginTop: 4 }}>
              v{item.version} · updated {item.updatedAt.slice(0, 10)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
