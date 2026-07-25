"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { RedirectFallback } from "@/components/common/feedback/redirect-fallback";
import { ROUTES } from "@/constants/routes";

import { useAuthStore } from "../stores/auth.store";

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * Never block the app shell on "Checking authentication".
 *
 * Middleware already requires a session hint for protected routes.
 * Render shell immediately; token + /me refresh in the background.
 * Only redirect after bootstrap confirms there is no valid session.
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const [redirectTimedOut, setRedirectTimedOut] = useState(false);

  useEffect(() => {
    if (!isInitialized || isAuthenticated) {
      setRedirectTimedOut(false);
      return;
    }

    const loginUrl = new URL(ROUTES.LOGIN, window.location.origin);
    loginUrl.searchParams.set("redirect", pathname);
    router.replace(`${loginUrl.pathname}${loginUrl.search}`);

    const timeout = window.setTimeout(() => {
      setRedirectTimedOut(true);
    }, 4_000);

    return () => window.clearTimeout(timeout);
  }, [isAuthenticated, isInitialized, pathname, router]);

  // Only gate after bootstrap confirms the session is gone.
  if (isInitialized && !isAuthenticated) {
    return (
      <RedirectFallback
        label="Redirecting to sign in"
        timedOut={redirectTimedOut}
        timeoutMessage="Sign-in is required to continue."
        actionLabel="Go to sign in"
        onAction={() => window.location.assign(ROUTES.LOGIN)}
      />
    );
  }

  // Instant shell — no "Checking authentication", no blank screen.
  return children;
}
