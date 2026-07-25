import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { FlashList } from "@shopify/flash-list";

import { aiService } from "@/api/ai.service";
import { queryKeys } from "@/api/query-keys";
import { StackHeader } from "@/components/navigation/StackHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { formatDateTime } from "@/lib/utils";
import { useTheme } from "@/theme/theme.store";

export default function AiHistoryScreen() {
  const theme = useTheme();
  const { colors, spacing, radius } = theme;
  const router = useRouter();

  const list = useQuery({
    queryKey: queryKeys.ai.conversations({ page: 1 }),
    queryFn: () => aiService.listConversations({ page: 1, limit: 50 }),
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StackHeader title="Chat history" subtitle="AI conversations" />

      {list.isLoading ? (
        <View style={{ padding: spacing[4] }}>
          <ListSkeleton />
        </View>
      ) : null}
      {list.isError ? (
        <View style={{ padding: spacing[4] }}>
          <ErrorState
            message="Could not load history."
            onRetry={() => void list.refetch()}
          />
        </View>
      ) : null}

      <FlashList
        data={list.data?.items ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          padding: spacing[4],
          paddingBottom: spacing[8],
        }}
        ListEmptyComponent={
          !list.isLoading ? (
            <EmptyState
              icon="chatbubbles-outline"
              title="No conversations yet"
              message="Start a chat from the AI Assistant."
            />
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push(
                `/(app)/ai-assistant?conversationId=${item.id}` as never,
              )
            }
            style={[
              styles.row,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: radius,
                padding: spacing[4],
                marginBottom: spacing[2],
              },
            ]}
          >
            <Text
              style={{ color: colors.foreground, fontWeight: "700" }}
              numberOfLines={1}
            >
              {item.title || "Untitled chat"}
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 4 }}>
              {formatDateTime(item.updatedAt)}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { borderWidth: 1 },
});
