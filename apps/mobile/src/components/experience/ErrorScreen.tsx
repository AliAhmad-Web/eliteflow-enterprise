import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Button } from "@/components/ui/Button";
import { useTheme } from "@/theme/theme.store";

interface ErrorScreenProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

/** Full-screen error surface for production routes. */
export function ErrorScreen({
  title = "Something went wrong",
  message = "Please try again. If the problem continues, check your connection or sign in again.",
  onRetry,
}: ErrorScreenProps) {
  const theme = useTheme();
  const { colors, spacing } = theme;

  return (
    <View style={[styles.wrap, { padding: spacing[8] }]}>
      <Ionicons
        name="alert-circle-outline"
        size={48}
        color={colors.destructive}
      />
      <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.message, { color: colors.mutedForeground }]}>
        {message}
      </Text>
      {onRetry ? (
        <View style={{ width: "100%", marginTop: 16 }}>
          <Button title="Retry" onPress={onRetry} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
