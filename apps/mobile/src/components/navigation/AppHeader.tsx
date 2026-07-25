import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  DrawerActions,
  useNavigation,
} from "expo-router/react-navigation";

import { useTheme } from "@/theme/theme.store";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  showSearch?: boolean;
  showNotifications?: boolean;
}

export function AppHeader({
  title,
  subtitle,
  showSearch = true,
  showNotifications = true,
}: AppHeaderProps) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const navigation = useNavigation();
  const router = useRouter();

  return (
    <View
      style={[
        styles.row,
        {
          paddingVertical: spacing[3],
          borderBottomColor: colors.navbarBorder,
          backgroundColor: colors.background,
        },
      ]}
    >
      <Pressable
        accessibilityLabel="Open menu"
        hitSlop={12}
        onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        style={styles.iconBtn}
      >
        <Ionicons name="menu" size={24} color={colors.foreground} />
      </Pressable>

      <View style={styles.titles}>
        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={styles.actions}>
        {showSearch ? (
          <Pressable
            accessibilityLabel="Search"
            hitSlop={10}
            onPress={() => router.push("/(app)/(tabs)/search")}
            style={styles.iconBtn}
          >
            <Ionicons name="search" size={22} color={colors.foreground} />
          </Pressable>
        ) : null}
        {showNotifications ? (
          <Pressable
            accessibilityLabel="Notifications"
            hitSlop={10}
            onPress={() => router.push("/(app)/(tabs)/notifications")}
            style={styles.iconBtn}
          >
            <Ionicons
              name="notifications-outline"
              size={22}
              color={colors.foreground}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  titles: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 1,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  iconBtn: {
    padding: 6,
  },
});
