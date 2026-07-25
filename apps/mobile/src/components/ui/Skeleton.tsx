import { memo } from "react";
import { StyleSheet, View } from "react-native";

import { useTheme } from "@/theme/theme.store";

interface SkeletonProps {
  height?: number;
  width?: number | `${number}%`;
  radius?: number;
  style?: object;
}

export const Skeleton = memo(function Skeleton({
  height = 16,
  width = "100%",
  radius,
  style,
}: SkeletonProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          height,
          width,
          borderRadius: radius ?? theme.radius - 4,
          backgroundColor: theme.colors.muted,
          opacity: 0.85,
        },
        style,
      ]}
    />
  );
});

export const ListSkeleton = memo(function ListSkeleton({
  rows = 6,
}: {
  rows?: number;
}) {
  const theme = useTheme();
  const { spacing, radius, colors } = theme;

  return (
    <View style={{ gap: spacing[3], paddingVertical: spacing[2] }}>
      {Array.from({ length: rows }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.row,
            {
              padding: spacing[4],
              borderRadius: radius,
              borderColor: colors.border,
              backgroundColor: colors.card,
              gap: spacing[2],
            },
          ]}
        >
          <Skeleton height={14} width="40%" />
          <Skeleton height={18} width="75%" />
          <Skeleton height={12} width="55%" />
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    borderWidth: 1,
  },
});
