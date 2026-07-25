import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { getBiometricCapability, useBiometricStore } from "@/auth/biometric.store";
import { Button } from "@/components/ui/Button";
import { useTheme } from "@/theme/theme.store";

/**
 * Optional biometric / app-lock overlay after session restore.
 * Does not replace JWT authentication — SecureStore tokens remain.
 */
export function BiometricGate({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const enabled = useBiometricStore((s) => s.enabled);
  const appLockEnabled = useBiometricStore((s) => s.appLockEnabled);
  const unlocked = useBiometricStore((s) => s.unlocked);
  const hydrated = useBiometricStore((s) => s.hydrated);
  const unlock = useBiometricStore((s) => s.unlock);
  const [label, setLabel] = useState("Biometrics");
  const [busy, setBusy] = useState(false);

  const gateActive = enabled || appLockEnabled;

  useEffect(() => {
    void getBiometricCapability().then((c) => setLabel(c.label));
  }, []);

  useEffect(() => {
    if (hydrated && gateActive && !unlocked) {
      void unlock();
    }
  }, [hydrated, gateActive, unlocked, unlock]);

  if (!hydrated || !gateActive || unlocked) {
    return <>{children}</>;
  }

  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: colors.background, padding: spacing[6] },
      ]}
    >
      <Text style={[styles.brand, { color: colors.primary }]}>EliteFlow</Text>
      <Text style={[styles.title, { color: colors.foreground }]}>
        Unlock to continue
      </Text>
      <Text
        style={{
          color: colors.mutedForeground,
          textAlign: "center",
          marginBottom: 24,
        }}
      >
        Use {label} or device PIN. Your session stays signed in securely.
      </Text>
      <Button
        title={`Unlock with ${label}`}
        loading={busy}
        onPress={() => {
          setBusy(true);
          void unlock().finally(() => setBusy(false));
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  brand: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
});
