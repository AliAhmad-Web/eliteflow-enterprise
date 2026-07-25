import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import { AppState, type AppStateStatus } from "react-native";
import { create } from "zustand";

const BIOMETRIC_ENABLED_KEY = "eliteflow-biometric-unlock-enabled";
const APP_LOCK_ENABLED_KEY = "eliteflow-app-lock-enabled";
const SESSION_TIMEOUT_KEY = "eliteflow-session-timeout-minutes";

/** Default idle timeout before requiring unlock again (minutes). 0 = disabled. */
const DEFAULT_TIMEOUT_MINUTES = 5;

interface BiometricStore {
  enabled: boolean;
  /** App lock uses biometrics / device PIN after background/idle. */
  appLockEnabled: boolean;
  /** Idle minutes before auto-lock. 0 disables idle lock. */
  sessionTimeoutMinutes: number;
  unlocked: boolean;
  hydrated: boolean;
  lastActiveAt: number;
  hydrate: () => Promise<void>;
  setEnabled: (value: boolean) => Promise<void>;
  setAppLockEnabled: (value: boolean) => Promise<void>;
  setSessionTimeoutMinutes: (minutes: number) => Promise<void>;
  unlock: () => Promise<boolean>;
  lock: () => void;
  touch: () => void;
  /** Call from AppState / idle timer — locks if timeout exceeded. */
  checkSessionTimeout: () => void;
}

/**
 * Optional biometric / app-lock gate after password login / session restore.
 * Does NOT replace JWT auth — only unlocks the local app shell.
 * Tokens remain in SecureStore.
 */
export const useBiometricStore = create<BiometricStore>((set, get) => ({
  enabled: false,
  appLockEnabled: false,
  sessionTimeoutMinutes: DEFAULT_TIMEOUT_MINUTES,
  unlocked: true,
  hydrated: false,
  lastActiveAt: Date.now(),

  hydrate: async () => {
    try {
      const [bio, lock, timeoutRaw] = await Promise.all([
        AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY),
        AsyncStorage.getItem(APP_LOCK_ENABLED_KEY),
        AsyncStorage.getItem(SESSION_TIMEOUT_KEY),
      ]);
      const enabled = bio === "1";
      const appLockEnabled = lock === "1" || enabled;
      const sessionTimeoutMinutes = timeoutRaw
        ? Number(timeoutRaw)
        : DEFAULT_TIMEOUT_MINUTES;
      set({
        enabled,
        appLockEnabled,
        sessionTimeoutMinutes: Number.isFinite(sessionTimeoutMinutes)
          ? sessionTimeoutMinutes
          : DEFAULT_TIMEOUT_MINUTES,
        unlocked: !(enabled || appLockEnabled),
        hydrated: true,
        lastActiveAt: Date.now(),
      });
    } catch {
      set({ hydrated: true, unlocked: true });
    }
  },

  setEnabled: async (value) => {
    await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, value ? "1" : "0");
    if (value) {
      await AsyncStorage.setItem(APP_LOCK_ENABLED_KEY, "1");
      set({
        enabled: true,
        appLockEnabled: true,
        unlocked: get().unlocked,
      });
    } else {
      set({ enabled: false });
    }
  },

  setAppLockEnabled: async (value) => {
    await AsyncStorage.setItem(APP_LOCK_ENABLED_KEY, value ? "1" : "0");
    set({
      appLockEnabled: value,
      unlocked: value ? get().unlocked : true,
    });
  },

  setSessionTimeoutMinutes: async (minutes) => {
    const safe = Math.max(0, Math.min(60, Math.round(minutes)));
    await AsyncStorage.setItem(SESSION_TIMEOUT_KEY, String(safe));
    set({ sessionTimeoutMinutes: safe });
  },

  unlock: async () => {
    const { enabled, appLockEnabled } = get();
    if (!enabled && !appLockEnabled) {
      set({ unlocked: true, lastActiveAt: Date.now() });
      return true;
    }

    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!compatible || !enrolled) {
      set({ unlocked: true, lastActiveAt: Date.now() });
      return true;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Unlock EliteFlow",
      cancelLabel: "Cancel",
      disableDeviceFallback: false,
    });

    if (result.success) {
      set({ unlocked: true, lastActiveAt: Date.now() });
      return true;
    }
    return false;
  },

  lock: () => {
    const { enabled, appLockEnabled } = get();
    if (enabled || appLockEnabled) set({ unlocked: false });
  },

  touch: () => {
    set({ lastActiveAt: Date.now() });
  },

  checkSessionTimeout: () => {
    const { sessionTimeoutMinutes, unlocked, enabled, appLockEnabled } =
      get();
    if (!unlocked) return;
    if (!enabled && !appLockEnabled) return;
    if (sessionTimeoutMinutes <= 0) return;

    const elapsed = Date.now() - get().lastActiveAt;
    if (elapsed >= sessionTimeoutMinutes * 60_000) {
      set({ unlocked: false });
    }
  },
}));

export async function getBiometricCapability() {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  const labels = types.map((t) => {
    if (t === LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION) {
      return "Face ID";
    }
    if (t === LocalAuthentication.AuthenticationType.FINGERPRINT) {
      return "Fingerprint";
    }
    if (t === LocalAuthentication.AuthenticationType.IRIS) {
      return "Iris";
    }
    return "Biometrics";
  });
  return {
    hasHardware,
    enrolled,
    label: labels[0] ?? "Device PIN",
  };
}

/**
 * Wire AppState + idle polling for session timeout / app lock.
 * Returns cleanup.
 */
export function startAppLockLifecycle() {
  const onChange = (state: AppStateStatus) => {
    if (state === "background") {
      useBiometricStore.getState().lock();
    }
    if (state === "active") {
      useBiometricStore.getState().checkSessionTimeout();
      useBiometricStore.getState().touch();
    }
  };

  const sub = AppState.addEventListener("change", onChange);
  const interval = setInterval(() => {
    useBiometricStore.getState().checkSessionTimeout();
  }, 30_000);

  return () => {
    sub.remove();
    clearInterval(interval);
  };
}
