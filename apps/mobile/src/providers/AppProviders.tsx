import { useEffect } from "react";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import {
  asyncStoragePersister,
  queryClient,
  shouldPersistQuery,
} from "@/api/query-client";
import { bootstrapSession } from "@/auth/session-bootstrap";
import { useAuthStore } from "@/auth/auth.store";
import {
  startAppLockLifecycle,
  useBiometricStore,
} from "@/auth/biometric.store";
import { BiometricGate } from "@/components/auth/BiometricGate";
import { OfflineBanner } from "@/components/offline/OfflineBanner";
import { startMutationQueueSync } from "@/offline/mutation-queue";
import { pushNotifications } from "@/notifications/push";
import { useTheme, useThemeStore } from "@/theme/theme.store";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function AuthNavigator() {
  const router = useRouter();
  const segments = useSegments();
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const themeHydrated = useThemeStore((s) => s.isHydrated);
  const theme = useTheme();

  useEffect(() => {
    let cancelled = false;
    let stopQueue: (() => void) | undefined;
    let stopPush: (() => void) | undefined;
    let stopLock: (() => void) | undefined;

    void (async () => {
      try {
        await useThemeStore.getState().hydrate();
        await useBiometricStore.getState().hydrate();
        await bootstrapSession();
      } catch {
        useAuthStore.getState().setInitialized(true);
      } finally {
        if (!cancelled) {
          await SplashScreen.hideAsync().catch(() => undefined);
        }
      }

      // Non-critical services only after first paint / splash hide.
      if (cancelled) return;
      try {
        stopQueue = startMutationQueueSync();
        stopPush = pushNotifications.attachListeners();
        stopLock = startAppLockLifecycle();
        if (useAuthStore.getState().isAuthenticated) {
          void pushNotifications.registerForPush().catch(() => undefined);
        }
      } catch {
        // Non-fatal — login shell must still render.
      }
    })();

    return () => {
      cancelled = true;
      stopQueue?.();
      stopPush?.();
      stopLock?.();
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    void pushNotifications.registerForPush().catch(() => undefined);
    useBiometricStore.getState().lock();
    useBiometricStore.getState().touch();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isInitialized || !themeHydrated) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/(auth)/login");
      return;
    }

    if (isAuthenticated && inAuthGroup) {
      router.replace("/(app)/(tabs)");
    }
  }, [isAuthenticated, isInitialized, themeHydrated, segments, router]);

  return (
    <BiometricGate>
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <StatusBar style={theme.id === "dark" ? "light" : "dark"} />
        {isAuthenticated ? <OfflineBanner /> : null}
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.background },
            animation: "fade",
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(app)" />
        </Stack>
      </View>
    </BiometricGate>
  );
}

export function AppProviders({ children }: { children?: React.ReactNode }) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister: asyncStoragePersister,
          maxAge: 24 * 60 * 60_000,
          dehydrateOptions: {
            shouldDehydrateQuery: (query) =>
              query.state.status === "success" &&
              shouldPersistQuery(query.queryKey),
          },
        }}
      >
        {children ?? <AuthNavigator />}
      </PersistQueryClientProvider>
    </GestureHandlerRootView>
  );
}
