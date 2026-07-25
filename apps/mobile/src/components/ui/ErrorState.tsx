import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Button } from "./Button";
import { useTheme } from "@/theme/theme.store";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
}: ErrorStateProps) {
  const theme = useTheme();
  const { colors, spacing, radius } = theme;

  return (
    <View
      style={[
        styles.wrap,
        {
          padding: spacing[6],
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: radius,
        },
      ]}
    >
      <Ionicons
        name="alert-circle-outline"
        size={36}
        color={colors.destructive}
      />
      <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.message, { color: colors.mutedForeground }]}>
        {message}
      </Text>
      {onRetry ? (
        <Button title="Try again" onPress={onRetry} fullWidth={false} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
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
    marginBottom: 4,
  },
});
