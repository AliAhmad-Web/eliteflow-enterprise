import { Pressable, StyleSheet, Text, View } from "react-native";

import { THEME_IDS, THEME_LABELS, type ThemeId } from "@/theme/tokens";
import { useTheme, useThemeStore } from "@/theme/theme.store";

export function ThemeSwitcher() {
  const theme = useTheme();
  const themeId = useThemeStore((s) => s.themeId);
  const setTheme = useThemeStore((s) => s.setTheme);
  const { colors, spacing, radius } = theme;

  return (
    <View style={[styles.grid, { gap: spacing[2] }]}>
      {THEME_IDS.map((id: ThemeId) => {
        const selected = id === themeId;
        return (
          <Pressable
            key={id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => setTheme(id)}
            style={[
              styles.chip,
              {
                borderRadius: radius,
                paddingVertical: spacing[3],
                paddingHorizontal: spacing[3],
                backgroundColor: selected ? colors.primary : colors.muted,
                borderColor: selected ? colors.primary : colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.swatch,
                {
                  backgroundColor:
                    id === "light"
                      ? "#6d28d9"
                      : id === "dark"
                        ? "#8b5cf6"
                        : id === "emerald"
                          ? "#047857"
                          : "#1d4ed8",
                },
              ]}
            />
            <Text
              style={[
                styles.label,
                {
                  color: selected
                    ? colors.primaryForeground
                    : colors.foreground,
                },
              ]}
            >
              {THEME_LABELS[id]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    minWidth: "46%",
    flexGrow: 1,
  },
  swatch: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
});
