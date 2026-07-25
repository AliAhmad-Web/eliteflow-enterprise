import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Button } from "@/components/ui/Button";
import { useTheme } from "@/theme/theme.store";

interface OfflineScreenProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  onOpenQueue?: () => void;
}

export function OfflineScreen({
  title = "You're offline",
  message = "Cached data stays available. Queued changes sync when you reconnect.",
  onRetry,
  onOpenQueue,
}: OfflineScreenProps) {
  const theme = useTheme();
  const { colors, spacing } = theme;

  return (
    <View style={[styles.wrap, { padding: spacing[8] }]}>
      <Ionicons name="cloud-offline-outline" size={48} color={colors.warning} />
      <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.message, { color: colors.mutedForeground }]}>
        {message}
      </Text>
      <View style={{ gap: 10, width: "100%", marginTop: 16 }}>
        {onRetry ? (
          <Button title="Try again" onPress={onRetry} />
        ) : null}
        {onOpenQueue ? (
          <Button title="Open sync queue" variant="secondary" onPress={onOpenQueue} />
        ) : null}
      </View>
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
