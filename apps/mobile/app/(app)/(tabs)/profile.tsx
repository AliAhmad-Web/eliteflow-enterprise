import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { authService } from "@/api/auth.service";
import { useAuthStore } from "@/auth/auth.store";
import { AppHeader } from "@/components/navigation/AppHeader";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { useTheme } from "@/theme/theme.store";

export default function ProfileScreen() {
  const theme = useTheme();
  const { colors, spacing, radius } = theme;
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  const initials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase()
    : "?";

  return (
    <Screen padded={false}>
      <View style={{ paddingHorizontal: spacing[4], gap: spacing[5] }}>
        <AppHeader title="Profile" subtitle="Your account" />

        <View
          style={[
            styles.hero,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: radius,
              padding: spacing[5],
            },
          ]}
        >
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={[styles.initials, { color: colors.primaryForeground }]}>
              {initials}
            </Text>
          </View>
          <Text style={[styles.name, { color: colors.foreground }]}>
            {user ? `${user.firstName} ${user.lastName}` : "—"}
          </Text>
          <Text style={{ color: colors.mutedForeground }}>{user?.email}</Text>
          <Text
            style={[
              styles.badge,
              { color: colors.primary, backgroundColor: colors.muted },
            ]}
          >
            {user?.role.name ?? "—"}
          </Text>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: radius,
              padding: spacing[4],
              gap: spacing[3],
            },
          ]}
        >
          <Row label="Status" value={user?.status ?? "—"} colors={colors} />
          <Row
            label="Email verified"
            value={user?.emailVerified ? "Yes" : "No"}
            colors={colors}
          />
          <Row
            label="Permissions"
            value={String(user?.permissions?.length ?? 0)}
            colors={colors}
          />
        </View>

        <Button
          title="Open settings"
          variant="secondary"
          onPress={() => router.push("/(app)/settings")}
        />

        <Button
          title="Sign out"
          variant="destructive"
          onPress={() => {
            void authService.logout().then(() => {
              router.replace("/(auth)/login");
            });
          }}
        />
      </View>
    </Screen>
  );
}

function Row({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: { mutedForeground: string; foreground: string };
}) {
  return (
    <View style={styles.row}>
      <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>{label}</Text>
      <Text style={{ color: colors.foreground, fontWeight: "600" }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: "center",
    borderWidth: 1,
    gap: 6,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  initials: {
    fontSize: 24,
    fontWeight: "800",
  },
  name: {
    fontSize: 20,
    fontWeight: "700",
  },
  badge: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: "700",
    overflow: "hidden",
  },
  card: {
    borderWidth: 1,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
