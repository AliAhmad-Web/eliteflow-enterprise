import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/theme/theme.store";

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
}

export function EmptyState({
  icon = "file-tray-outline",
  title,
  message,
}: EmptyStateProps) {
  const theme = useTheme();
  const { colors, spacing } = theme;

  return (
    <View style={[styles.wrap, { padding: spacing[8] }]}>
      <Ionicons name={icon} size={40} color={colors.mutedForeground} />
      <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
      {message ? (
        <Text style={[styles.message, { color: colors.mutedForeground }]}>
          {message}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 160,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
