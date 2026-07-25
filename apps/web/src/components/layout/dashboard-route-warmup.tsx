"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuthStore } from "@/features/auth/stores/auth.store";
import {
  matchKeepAliveRoute,
  preloadKeepAliveRoute,
} from "@/lib/navigation/keep-alive-registry";

function runWhenIdle(callback: () => void, timeoutMs = 4_000) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const w = window as Window & {
    requestIdleCallback?: (
      cb: IdleRequestCallback,
      opts?: IdleRequestOptions,
    ) => number;
    cancelIdleCallback?: (id: number) => void;
  };

  if (typeof w.requestIdleCallback === "function") {
    const id = w.requestIdleCallback(() => callback(), { timeout: timeoutMs });
    return () => w.cancelIdleCallback?.(id);
  }

  const id = window.setTimeout(callback, 400);
  return () => window.clearTimeout(id);
}

/**
 * After access token is ready: warm ONLY the current route chunk.
 * Avoid Settings/Communication/list stampede that saturates refresh (RC#1, RC#3).
 */
export function DashboardRouteWarmup() {
  const router = useRouter();
  const pathname = usePathname();
  const accessToken = useAuthStore((s) => s.accessToken);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const ranRef = useRef(false);

  useEffect(() => {
    // RC#1: do not fire authed prefetches until token exists (avoids refresh stampede).
    if (!isAuthenticated || !accessToken || ranRef.current) {
      return;
    }
    ranRef.current = true;

    const current = matchKeepAliveRoute(pathname) ?? pathname;

    void (async () => {
      try {
        void preloadKeepAliveRoute(current);
        router.prefetch(current);
      } catch {
        // Best-effort
      }
    })();

    // RC#3: idle — preload one adjacent chunk only (dashboard home), not all routes/APIs.
    return runWhenIdle(() => {
      void (async () => {
        try {
          const { ROUTES } = await import("@/constants/routes");
          if (current !== ROUTES.DASHBOARD) {
            void preloadKeepAliveRoute(ROUTES.DASHBOARD);
          }
        } catch {
          // ignore
        }
      })();
    });
  }, [accessToken, isAuthenticated, pathname, router]);

  return null;
}
