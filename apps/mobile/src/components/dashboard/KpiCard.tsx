import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/theme/theme.store";

interface KpiCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent?: string;
  onPress?: () => void;
}

export function KpiCard({
  label,
  value,
  hint,
  icon,
  accent,
  onPress,
}: KpiCardProps) {
  const theme = useTheme();
  const { colors, spacing, radius } = theme;
  const tint = accent ?? colors.primary;

  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: radius,
          padding: spacing[4],
          opacity: pressed && onPress ? 0.9 : 1,
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: `${tint}22` }]}>
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      <Text style={[styles.value, { color: colors.foreground }]}>{value}</Text>
      {hint ? (
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          {hint}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    flex: 1,
    minWidth: "46%",
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  value: {
    fontSize: 22,
    fontWeight: "700",
    marginTop: 4,
    letterSpacing: -0.4,
  },
  hint: {
    fontSize: 12,
    marginTop: 4,
  },
});
