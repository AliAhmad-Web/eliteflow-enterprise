import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

import { pushDeviceRegistration } from "@/notifications/device-registration";

const TOKEN_KEY = "eliteflow-expo-push-token";

try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch {
  // Native notifications module can throw during cold start on some devices.
}

function platformLabel(): "ios" | "android" | "web" | "unknown" {
  if (Platform.OS === "ios") return "ios";
  if (Platform.OS === "android") return "android";
  if (Platform.OS === "web") return "web";
  return "unknown";
}

/**
 * Push notification client — production-ready on-device.
 *
 * Backend currently has NO device-token registration endpoint
 * (PUSH channel is stubbed server-side). This module:
 * 1. Requests permissions
 * 2. Obtains Expo push token
 * 3. Persists token locally
 * 4. Attempts adapter registration when wired
 * 5. Handles foreground/background notification responses + deep links
 */
export const pushNotifications = {
  async ensurePermissions(): Promise<boolean> {
    if (!Device.isDevice && Platform.OS !== "web") {
      return false;
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let final = existing;
    if (existing !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      final = status;
    }
    return final === "granted";
  },

  async registerForPush(): Promise<string | null> {
    const granted = await this.ensurePermissions();
    if (!granted) return null;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "EliteFlow",
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#0F766E",
      });
      await Notifications.setNotificationChannelAsync("critical", {
        name: "EliteFlow Alerts",
        importance: Notifications.AndroidImportance.HIGH,
      });
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    try {
      const token = (
        await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined,
        )
      ).data;
      await AsyncStorage.setItem(TOKEN_KEY, token);
      await this.registerStoredTokenWithBackend();
      return token;
    } catch {
      return null;
    }
  },

  /**
   * Hook for future backend registration — safe to call repeatedly.
   * No-ops until `pushDeviceRegistration.setRegister` is configured.
   */
  async registerStoredTokenWithBackend() {
    const token = await this.getStoredToken();
    if (!token) return { registered: false as const };

    return pushDeviceRegistration.register({
      token,
      platform: platformLabel(),
      appVersion: Constants.expoConfig?.version,
    });
  },

  async getStoredToken() {
    return AsyncStorage.getItem(TOKEN_KEY);
  },

  handleDeepLink(data: Record<string, unknown> | undefined) {
    if (!data) return;

    if (typeof data.path === "string" && data.path.startsWith("/")) {
      router.push(data.path as never);
      return;
    }

    const entityType = String(data.entityType ?? "").toLowerCase();
    const entityId = String(data.entityId ?? "");
    if (!entityId) return;

    if (entityType.includes("client")) {
      router.push(`/(app)/clients/${entityId}` as never);
    } else if (entityType.includes("project")) {
      router.push(`/(app)/projects/${entityId}` as never);
    } else if (entityType.includes("task")) {
      router.push(`/(app)/tasks/${entityId}` as never);
    } else if (
      entityType.includes("conversation") ||
      entityType.includes("message")
    ) {
      router.push(`/(app)/communication/${entityId}` as never);
    } else if (entityType.includes("file")) {
      router.push(`/(app)/files/${entityId}` as never);
    } else {
      router.push("/(app)/(tabs)/notifications" as never);
    }
  },

  attachListeners() {
    try {
      const received = Notifications.addNotificationReceivedListener(() => {
        // Foreground — handler already shows banner
      });

      const response = Notifications.addNotificationResponseReceivedListener(
        (res) => {
          const data = res.notification.request.content.data as
            | Record<string, unknown>
            | undefined;
          this.handleDeepLink(data);
        },
      );

      return () => {
        received.remove();
        response.remove();
      };
    } catch {
      return () => undefined;
    }
  },

  createDeepLink(path: string) {
    return Linking.createURL(path);
  },
};
