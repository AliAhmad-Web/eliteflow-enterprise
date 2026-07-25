import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/theme/theme.store";

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({
  title,
  actionLabel,
  onAction,
}: SectionHeaderProps) {
  const theme = useTheme();
  const { colors, spacing } = theme;

  return (
    <View style={[styles.row, { marginBottom: spacing[3] }]}>
      <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
      {actionLabel && onAction ? (
        <Text
          onPress={onAction}
          style={[styles.action, { color: colors.primary }]}
        >
          {actionLabel}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  action: {
    fontSize: 13,
    fontWeight: "600",
  },
});
