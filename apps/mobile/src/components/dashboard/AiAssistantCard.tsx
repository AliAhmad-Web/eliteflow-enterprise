import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useTheme } from "@/theme/theme.store";

export function AiAssistantCard() {
  const theme = useTheme();
  const { colors, spacing, radius } = theme;
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push("/(app)/ai-assistant")}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.accent,
          borderColor: colors.border,
          borderRadius: radius,
          padding: spacing[4],
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: colors.primary }]}>
          <Ionicons
            name="sparkles"
            size={18}
            color={colors.primaryForeground}
          />
        </View>
        <View style={styles.meta}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            AI Assistant
          </Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            Ask about projects, revenue, or next actions
          </Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={colors.mutedForeground}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  meta: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
  sub: {
    fontSize: 13,
    marginTop: 2,
  },
});
