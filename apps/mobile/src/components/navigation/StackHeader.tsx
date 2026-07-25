import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/theme/theme.store";

interface StackHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}

export function StackHeader({
  title,
  subtitle,
  onBack,
  right,
}: StackHeaderProps) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingTop: insets.top + spacing[2],
          paddingBottom: spacing[3],
          paddingHorizontal: spacing[4],
          borderBottomColor: colors.navbarBorder,
          backgroundColor: colors.background,
        },
      ]}
    >
      <Pressable
        accessibilityLabel="Go back"
        hitSlop={12}
        onPress={onBack ?? (() => router.back())}
        style={styles.back}
      >
        <Ionicons name="chevron-back" size={24} color={colors.foreground} />
      </Pressable>
      <View style={styles.titles}>
        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[styles.sub, { color: colors.mutedForeground }]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  back: {
    padding: 4,
  },
  titles: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  sub: {
    fontSize: 12,
    marginTop: 1,
  },
  right: {
    minWidth: 40,
    alignItems: "flex-end",
  },
});
