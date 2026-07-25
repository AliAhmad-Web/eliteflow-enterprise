import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/theme/theme.store";

interface StatusBadgeProps {
  label: string;
  tone?: "default" | "success" | "warning" | "danger" | "info";
}

export const StatusBadge = memo(function StatusBadge({
  label,
  tone = "default",
}: StatusBadgeProps) {
  const theme = useTheme();
  const { colors, radius } = theme;

  const bg =
    tone === "success"
      ? `${colors.success}22`
      : tone === "warning"
        ? `${colors.warning}22`
        : tone === "danger"
          ? `${colors.destructive}22`
          : tone === "info"
            ? `${colors.info}22`
            : colors.muted;

  const fg =
    tone === "success"
      ? colors.success
      : tone === "warning"
        ? colors.warning
        : tone === "danger"
          ? colors.destructive
          : tone === "info"
            ? colors.info
            : colors.mutedForeground;

  return (
    <View style={[styles.badge, { backgroundColor: bg, borderRadius: radius - 4 }]}>
      <Text style={[styles.text, { color: fg }]}>{label.replace(/_/g, " ")}</Text>
    </View>
  );
});

interface ProgressBarProps {
  value: number;
}

export const ProgressBar = memo(function ProgressBar({ value }: ProgressBarProps) {
  const theme = useTheme();
  const { colors, radius } = theme;
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <View style={[styles.track, { backgroundColor: colors.muted, borderRadius: radius }]}>
      <View
        style={{
          width: `${clamped}%`,
          height: "100%",
          backgroundColor: colors.primary,
          borderRadius: radius,
        }}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  track: {
    height: 6,
    width: "100%",
    overflow: "hidden",
  },
});
