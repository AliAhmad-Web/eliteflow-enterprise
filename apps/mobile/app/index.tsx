import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { useAuthStore } from "@/auth/auth.store";
import { getAuthenticatedHomePath } from "@/lib/home-route";
import { useTheme } from "@/theme/theme.store";

/**
 * Splash / entry redirect — shown briefly while session bootstrap runs.
 */
export default function IndexScreen() {
  const theme = useTheme();
  const router = useRouter();
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const roleCode = useAuthStore((s) => s.user?.role.code);

  useEffect(() => {
    if (!isInitialized) return;
    router.replace(
      (isAuthenticated
        ? getAuthenticatedHomePath(roleCode)
        : "/(auth)/login") as never,
    );
  }, [isInitialized, isAuthenticated, roleCode, router]);

  return (
    <View
      style={[styles.wrap, { backgroundColor: theme.colors.background }]}
    >
      <Text style={[styles.brand, { color: theme.colors.primary }]}>
        EliteFlow
      </Text>
      <Text style={[styles.tag, { color: theme.colors.mutedForeground }]}>
        Enterprise Business Management
      </Text>
      <ActivityIndicator
        style={styles.spinner}
        color={theme.colors.primary}
        size="large"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  brand: {
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -1,
  },
  tag: {
    marginTop: 8,
    fontSize: 14,
  },
  spinner: {
    marginTop: 32,
  },
});
