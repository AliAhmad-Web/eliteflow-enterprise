import {
  Drawer,
  DrawerContentScrollView,
  DrawerItem,
  type DrawerContentComponentProps,
} from "expo-router/drawer";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { authService } from "@/api/auth.service";
import { useAuthStore } from "@/auth/auth.store";
import { usePermissions } from "@/hooks/usePermissions";
import { useTheme } from "@/theme/theme.store";

function CustomDrawerContent(props: DrawerContentComponentProps) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const perms = usePermissions();

  const name = user
    ? `${user.firstName} ${user.lastName}`.trim()
    : "EliteFlow User";

  const item = (
    label: string,
    icon: keyof typeof Ionicons.glyphMap,
    href: string,
  ) => (
    <DrawerItem
      label={label}
      icon={({ color, size }) => (
        <Ionicons name={icon} color={color} size={size} />
      )}
      activeTintColor={colors.primary}
      inactiveTintColor={colors.sidebarForeground}
      onPress={() => router.push(href as never)}
    />
  );

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={{
        flex: 1,
        backgroundColor: colors.sidebarBackground,
      }}
    >
      <View style={[styles.header, { padding: spacing[4] }]}>
        <Text style={[styles.brand, { color: colors.primary }]}>EliteFlow</Text>
        <Text style={[styles.name, { color: colors.foreground }]}>{name}</Text>
        <Text style={[styles.role, { color: colors.mutedForeground }]}>
          {user?.role.name ?? "—"}
        </Text>
      </View>

      {perms.isClient
        ? item("Portal", "home-outline", "/(app)/portal")
        : item("Dashboard", "grid-outline", "/(app)/(tabs)")}
      {perms.canReadClients
        ? item("Clients", "people-outline", "/(app)/clients")
        : null}
      {perms.canReadClients
        ? item("Pipeline", "git-branch-outline", "/(app)/clients/pipeline")
        : null}
      {perms.canReadProjects
        ? item("Projects", "briefcase-outline", "/(app)/projects")
        : null}
      {perms.canReadTasks
        ? item("Tasks", "checkbox-outline", "/(app)/tasks")
        : null}
      {perms.canReadInvoices
        ? item("Invoices", "receipt-outline", "/(app)/invoices")
        : null}
      {item("Billing", "card-outline", "/(app)/billing")}
      {perms.canReadCalendar
        ? item("Calendar", "calendar-outline", "/(app)/calendar")
        : null}
      {perms.canReadChat || perms.canReadCommunication
        ? item("Messages", "chatbubbles-outline", "/(app)/communication")
        : null}
      {perms.canReadWhiteboards
        ? item("Whiteboards", "easel-outline", "/(app)/whiteboards")
        : null}
      {perms.canReadFiles
        ? item("Files", "folder-outline", "/(app)/files")
        : null}
      {!perms.isClient
        ? item("Search", "search-outline", "/(app)/(tabs)/search")
        : null}
      {item(
        "Notifications",
        "notifications-outline",
        "/(app)/(tabs)/notifications",
      )}
      {perms.canUseAi && !perms.isClient
        ? item("AI Assistant", "sparkles-outline", "/(app)/ai-assistant")
        : null}
      {perms.canUseAi && !perms.isClient
        ? item(
            "AI Documents",
            "document-text-outline",
            "/(app)/ai-assistant/documents",
          )
        : null}
      {item("Sync queue", "cloud-outline", "/(app)/offline-queue")}
      {item("Profile", "person-outline", "/(app)/(tabs)/profile")}
      {item("Settings", "settings-outline", "/(app)/settings")}

      <View style={styles.spacer} />

      <DrawerItem
        label="Sign out"
        icon={({ size }) => (
          <Ionicons
            name="log-out-outline"
            color={colors.destructive}
            size={size}
          />
        )}
        labelStyle={{ color: colors.destructive }}
        onPress={() => {
          void authService.logout().then(() => {
            router.replace("/(auth)/login");
          });
        }}
      />
    </DrawerContentScrollView>
  );
}

export default function AppDrawerLayout() {
  const theme = useTheme();

  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: "front",
        overlayColor: "rgba(0,0,0,0.45)",
        drawerStyle: {
          backgroundColor: theme.colors.sidebarBackground,
          width: 300,
        },
        sceneStyle: {
          backgroundColor: theme.colors.background,
        },
      }}
    >
      <Drawer.Screen name="(tabs)" options={{ title: "Home" }} />
      <Drawer.Screen name="portal" options={{ title: "Portal" }} />
      <Drawer.Screen name="clients" options={{ title: "Clients" }} />
      <Drawer.Screen name="projects" options={{ title: "Projects" }} />
      <Drawer.Screen name="tasks" options={{ title: "Tasks" }} />
      <Drawer.Screen name="invoices" options={{ title: "Invoices" }} />
      <Drawer.Screen name="billing" options={{ title: "Billing" }} />
      <Drawer.Screen name="calendar" options={{ title: "Calendar" }} />
      <Drawer.Screen name="communication" options={{ title: "Messages" }} />
      <Drawer.Screen name="whiteboards" options={{ title: "Whiteboards" }} />
      <Drawer.Screen name="files" options={{ title: "Files" }} />
      <Drawer.Screen name="settings" options={{ title: "Settings" }} />
      <Drawer.Screen name="offline-queue" options={{ title: "Sync queue" }} />
      <Drawer.Screen name="ai-assistant" options={{ title: "AI Assistant" }} />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 8 },
  brand: { fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  name: { marginTop: 16, fontSize: 16, fontWeight: "700" },
  role: { marginTop: 2, fontSize: 13 },
  spacer: { flex: 1, minHeight: 24 },
});
