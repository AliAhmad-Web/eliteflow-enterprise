import { useEffect, useState } from "react";
import { Alert, StyleSheet, Switch, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { getApiBaseUrl } from "@/api/api-error";
import {
  getBiometricCapability,
  useBiometricStore,
} from "@/auth/biometric.store";
import { AppHeader } from "@/components/navigation/AppHeader";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { pushDeviceRegistration } from "@/notifications/device-registration";
import { pushNotifications } from "@/notifications/push";
import { mutationQueue } from "@/offline/mutation-queue";
import { useTheme } from "@/theme/theme.store";

const TIMEOUT_OPTIONS = [
  { label: "Off", value: 0 },
  { label: "1 min", value: 1 },
  { label: "5 min", value: 5 },
  { label: "15 min", value: 15 },
];

export default function SettingsScreen() {
  const theme = useTheme();
  const { colors, spacing, radius } = theme;
  const router = useRouter();
  const biometricEnabled = useBiometricStore((s) => s.enabled);
  const appLockEnabled = useBiometricStore((s) => s.appLockEnabled);
  const sessionTimeoutMinutes = useBiometricStore((s) => s.sessionTimeoutMinutes);
  const setBiometricEnabled = useBiometricStore((s) => s.setEnabled);
  const setAppLockEnabled = useBiometricStore((s) => s.setAppLockEnabled);
  const setSessionTimeoutMinutes = useBiometricStore(
    (s) => s.setSessionTimeoutMinutes,
  );
  const lock = useBiometricStore((s) => s.lock);
  const [bioLabel, setBioLabel] = useState("Biometrics");
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [queueCount, setQueueCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    void getBiometricCapability().then((c) => setBioLabel(c.label));
    void pushNotifications.getStoredToken().then(setPushToken);
    return mutationQueue.subscribe((items) => setQueueCount(items.length));
  }, []);

  return (
    <Screen padded={false}>
      <View style={{ paddingHorizontal: spacing[4], gap: spacing[6] }}>
        <AppHeader title="Settings" subtitle="Preferences" />

        <View style={{ gap: spacing[3] }}>
          <Text style={[styles.section, { color: colors.foreground }]}>
            Appearance
          </Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>
            Same theme engine as the web app — Light, Dark, Emerald, Sapphire.
          </Text>
          <ThemeSwitcher />
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
          <Text style={[styles.section, { color: colors.foreground }]}>
            Security
          </Text>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.foreground, fontWeight: "600" }}>
                Unlock with {bioLabel}
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                Face ID / Fingerprint after sign-in. JWT stays in Secure Store.
              </Text>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={(v) => void setBiometricEnabled(v)}
              trackColor={{ true: colors.primary }}
            />
          </View>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.foreground, fontWeight: "600" }}>
                App lock
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                Require unlock when returning from background.
              </Text>
            </View>
            <Switch
              value={appLockEnabled}
              onValueChange={(v) => void setAppLockEnabled(v)}
              trackColor={{ true: colors.primary }}
            />
          </View>
          <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
            Session timeout
          </Text>
          <View style={styles.timeoutRow}>
            {TIMEOUT_OPTIONS.map((opt) => {
              const active = sessionTimeoutMinutes === opt.value;
              return (
                <Button
                  key={opt.value}
                  title={opt.label}
                  variant={active ? "primary" : "secondary"}
                  fullWidth={false}
                  onPress={() => void setSessionTimeoutMinutes(opt.value)}
                />
              );
            })}
          </View>
          <Button
            title="Lock now"
            variant="secondary"
            onPress={() => lock()}
          />
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: radius,
              padding: spacing[4],
              gap: spacing[2],
            },
          ]}
        >
          <Text style={[styles.section, { color: colors.foreground }]}>
            Push notifications
          </Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
            Expo token prepared on-device
            {pushDeviceRegistration.isReady()
              ? " and registration adapter is wired."
              : ". Backend device registration not available yet (adapter ready)."}
          </Text>
          <Text
            style={{ color: colors.mutedForeground, fontSize: 11 }}
            selectable
          >
            {pushToken ?? "No token yet"}
          </Text>
          <Button
            title="Register push token"
            variant="secondary"
            onPress={() => {
              void pushNotifications.registerForPush().then((token) => {
                setPushToken(token);
                Alert.alert(
                  token ? "Token ready" : "Unavailable",
                  token
                    ? pushDeviceRegistration.isReady()
                      ? "Token stored and registration adapter invoked."
                      : "Stored locally for future backend registration."
                    : "Permissions denied or device unsupported.",
                );
              });
            }}
          />
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: radius,
              padding: spacing[4],
              gap: spacing[2],
            },
          ]}
        >
          <Text style={[styles.section, { color: colors.foreground }]}>
            Offline queue
          </Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
            {queueCount} pending mutation(s). Auto-flushes on reconnect.
          </Text>
          <Button
            title="Open queue inspector"
            variant="secondary"
            onPress={() => router.push("/(app)/offline-queue")}
          />
          <Button
            title="Sync now"
            variant="secondary"
            loading={syncing}
            onPress={() => {
              setSyncing(true);
              void mutationQueue.flush().then((r) => {
                setSyncing(false);
                Alert.alert(
                  "Sync complete",
                  `Synced ${r.synced}, failed ${r.failed}, conflicts ${r.conflicts}`,
                );
              });
            }}
          />
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: radius,
              padding: spacing[4],
              gap: spacing[2],
            },
          ]}
        >
          <Text style={[styles.section, { color: colors.foreground }]}>
            API connection
          </Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
            {getApiBaseUrl()}
          </Text>
        </View>

        <Button
          title="Back to dashboard"
          variant="secondary"
          onPress={() => router.push("/(app)/(tabs)")}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    fontSize: 17,
    fontWeight: "700",
  },
  card: {
    borderWidth: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  timeoutRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});
