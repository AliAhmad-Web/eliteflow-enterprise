"use client";

import { ROLE_DASHBOARD_ROUTES, type UserRole } from "@enterprise/shared";
import { useEffect, useLayoutEffect, useState } from "react";

import { RedirectFallback } from "@/components/common/feedback/redirect-fallback";
import { ROUTES } from "@/constants/routes";

import { useAuth } from "../hooks/use-auth";
import { readCachedAuthUser } from "../utils/auth-session-cache";

function roleHome(
  roleCode: string,
  options?: { mfaEnrollmentRequired?: boolean },
): string {
  if (options?.mfaEnrollmentRequired) {
    return ROUTES.SECURITY;
  }
  return ROLE_DASHBOARD_ROUTES[roleCode as UserRole] ?? ROUTES.DASHBOARD;
}

/**
 * Sends signed-in users to their role home and guests to login.
 * Hard navigation avoids Next.js router-init blank screens on `/`.
 */
export function RoleHomeRedirect() {
  const { user, isAuthenticated, isInitialized } = useAuth();
  const [redirectTimedOut, setRedirectTimedOut] = useState(false);

  useLayoutEffect(() => {
    const cached = readCachedAuthUser();
    const roleUser = user ?? cached;
    if (!roleUser) return;
    if (!(cached || (isAuthenticated && user))) return;
    window.location.replace(
      roleHome(roleUser.role.code, {
        mfaEnrollmentRequired: Boolean(roleUser.mfaEnrollmentRequired),
      }),
    );
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (!isInitialized) return;

    const timeout = window.setTimeout(() => setRedirectTimedOut(true), 4_000);

    if (!isAuthenticated || !user) {
      window.location.replace(ROUTES.LOGIN);
      return () => window.clearTimeout(timeout);
    }

    window.location.replace(
      roleHome(user.role.code, {
        mfaEnrollmentRequired: Boolean(user.mfaEnrollmentRequired),
      }),
    );
    return () => window.clearTimeout(timeout);
  }, [isAuthenticated, isInitialized, user]);

  return (
    <RedirectFallback
      label="Opening your workspace"
      timedOut={redirectTimedOut}
      timeoutMessage="Unable to open your home page automatically."
      actionLabel="Go to sign in"
      onAction={() => window.location.assign(ROUTES.LOGIN)}
    />
  );
}
