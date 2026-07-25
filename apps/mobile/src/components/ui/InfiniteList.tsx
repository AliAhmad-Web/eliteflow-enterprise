import { memo, useCallback, type ReactElement } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { FlashList, type ListRenderItem as FlashListRenderItem } from "@shopify/flash-list";

import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";
import { ListSkeleton } from "./Skeleton";
import { useTheme } from "@/theme/theme.store";

interface InfiniteListProps<T> {
  data: T[];
  keyExtractor: (item: T) => string;
  renderItem: FlashListRenderItem<T>;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onEndReached?: () => void;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyIcon?: React.ComponentProps<typeof EmptyState>["icon"];
  ListHeaderComponent?: ReactElement | null;
  contentPadding?: number;
}

function InfiniteListInner<T>({
  data,
  keyExtractor,
  renderItem,
  isLoading,
  isError,
  errorMessage = "Could not load items.",
  onRetry,
  isRefreshing,
  onRefresh,
  hasNextPage,
  isFetchingNextPage,
  onEndReached,
  emptyTitle = "Nothing here",
  emptyMessage,
  emptyIcon,
  ListHeaderComponent,
  contentPadding,
}: InfiniteListProps<T>) {
  const theme = useTheme();
  const { colors, spacing } = theme;

  const handleEnd = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      onEndReached?.();
    }
  }, [hasNextPage, isFetchingNextPage, onEndReached]);

  if (isLoading && data.length === 0) {
    return (
      <View style={{ paddingHorizontal: contentPadding ?? spacing[4] }}>
        {ListHeaderComponent}
        <ListSkeleton />
      </View>
    );
  }

  if (isError && data.length === 0) {
    return (
      <View style={{ paddingHorizontal: contentPadding ?? spacing[4], gap: spacing[3] }}>
        {ListHeaderComponent}
        <ErrorState message={errorMessage} onRetry={onRetry} />
      </View>
    );
  }

  return (
    <FlashList
      data={data}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      onEndReached={handleEnd}
      onEndReachedThreshold={0.4}
      ListHeaderComponent={ListHeaderComponent}
      contentContainerStyle={{
        paddingHorizontal: contentPadding ?? spacing[4],
        paddingBottom: spacing[8],
      }}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={Boolean(isRefreshing)}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        ) : undefined
      }
      ListEmptyComponent={
        <EmptyState
          icon={emptyIcon}
          title={emptyTitle}
          message={emptyMessage}
        />
      }
      ListFooterComponent={
        isFetchingNextPage ? (
          <View style={styles.footer}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : null
      }
    />
  );
}

export const InfiniteList = memo(InfiniteListInner) as typeof InfiniteListInner;

const styles = StyleSheet.create({
  footer: {
    paddingVertical: 16,
  },
});
