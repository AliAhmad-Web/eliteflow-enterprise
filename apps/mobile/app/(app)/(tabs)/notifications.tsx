import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { notificationsService } from "@/api/dashboard.service";
import { queryKeys } from "@/api/query-keys";
import { AppHeader } from "@/components/navigation/AppHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Screen } from "@/components/ui/Screen";
import { useTheme } from "@/theme/theme.store";

export default function NotificationsScreen() {
  const theme = useTheme();
  const { colors, spacing, radius } = theme;
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: queryKeys.notifications(1),
    queryFn: () => notificationsService.list({ page: 1, pageSize: 30 }),
  });

  const markAll = useMutation({
    mutationFn: () => notificationsService.markAllRead(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const items = listQuery.data?.items ?? [];

  return (
    <Screen scroll={false} padded={false}>
      <View style={{ paddingHorizontal: spacing[4], flex: 1 }}>
        <AppHeader
          title="Notifications"
          subtitle={
            items.length ? `${items.length} recent` : "Stay on top of activity"
          }
          showNotifications={false}
        />

        <View style={[styles.toolbar, { marginVertical: spacing[3] }]}>
          <Pressable
            onPress={() => markAll.mutate()}
            disabled={markAll.isPending || !items.length}
          >
            <Text style={{ color: colors.primary, fontWeight: "600" }}>
              Mark all read
            </Text>
          </Pressable>
        </View>

        {listQuery.isLoading ? <LoadingState /> : null}
        {listQuery.isError ? (
          <ErrorState
            message="Could not load notifications."
            onRetry={() => void listQuery.refetch()}
          />
        ) : null}

        {!listQuery.isLoading && !listQuery.isError && items.length === 0 ? (
          <EmptyState
            icon="notifications-off-outline"
            title="No notifications"
            message="You're all caught up."
          />
        ) : null}

        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: spacing[8], gap: spacing[2] }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                if (!item.isRead) {
                  void notificationsService.markRead(item.id).then(() => {
                    void queryClient.invalidateQueries({
                      queryKey: ["notifications"],
                    });
                  });
                }
              }}
              style={[
                styles.row,
                {
                  backgroundColor: item.isRead ? colors.card : colors.accent,
                  borderColor: colors.border,
                  borderRadius: radius,
                  padding: spacing[4],
                },
              ]}
            >
              <Text style={[styles.title, { color: colors.foreground }]}>
                {item.title}
              </Text>
              {item.body ? (
                <Text
                  numberOfLines={2}
                  style={[styles.body, { color: colors.mutedForeground }]}
                >
                  {item.body}
                </Text>
              ) : null}
            </Pressable>
          )}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  row: {
    borderWidth: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
  },
  body: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
  },
});
