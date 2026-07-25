import { memo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/theme/theme.store";

export interface ChipOption<T extends string = string> {
  value: T | "";
  label: string;
}

interface FilterChipsProps<T extends string> {
  options: ChipOption<T>[];
  value: T | "";
  onChange: (value: T | "") => void;
}

function FilterChipsInner<T extends string>({
  options,
  value,
  onChange,
}: FilterChipsProps<T>) {
  const theme = useTheme();
  const { colors, spacing, radius } = theme;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: spacing[2], paddingVertical: spacing[1] }}
    >
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <Pressable
            key={opt.label}
            onPress={() => onChange(opt.value)}
            style={[
              styles.chip,
              {
                backgroundColor: selected ? colors.primary : colors.muted,
                borderRadius: radius,
                paddingHorizontal: spacing[3],
                paddingVertical: spacing[2],
              },
            ]}
          >
            <Text
              style={{
                color: selected ? colors.primaryForeground : colors.foreground,
                fontSize: 13,
                fontWeight: "600",
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export const FilterChips = memo(FilterChipsInner) as typeof FilterChipsInner;

interface SortBarProps {
  label: string;
  ascending: boolean;
  onToggleOrder: () => void;
  onPressSort?: () => void;
}

export const SortBar = memo(function SortBar({
  label,
  ascending,
  onToggleOrder,
  onPressSort,
}: SortBarProps) {
  const theme = useTheme();
  const { colors, spacing } = theme;

  return (
    <View style={[styles.sortRow, { gap: spacing[3] }]}>
      <Pressable onPress={onPressSort} style={{ flex: 1 }}>
        <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
          Sort:{" "}
          <Text style={{ color: colors.foreground, fontWeight: "600" }}>
            {label}
          </Text>
        </Text>
      </Pressable>
      <Pressable onPress={onToggleOrder} hitSlop={8}>
        <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 13 }}>
          {ascending ? "ASC" : "DESC"}
        </Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  chip: {},
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
  },
});
