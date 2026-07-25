import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/theme/theme.store";

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = "Loading…" }: LoadingStateProps) {
  const theme = useTheme();
  const { colors, spacing } = theme;

  return (
    <View style={[styles.wrap, { padding: spacing[8] }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.text, { color: colors.mutedForeground }]}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    minHeight: 160,
  },
  text: {
    fontSize: 15,
  },
});
