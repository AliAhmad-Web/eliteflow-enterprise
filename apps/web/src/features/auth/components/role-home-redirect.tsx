"use client";

import { ROLE_DASHBOARD_ROUTES, type UserRole } from "@enterprise/shared";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect } from "react";

import { ROUTES } from "@/constants/routes";

import { useAuth } from "../hooks/use-auth";
import { readCachedAuthUser } from "../utils/auth-session-cache";

/**
 * Sends signed-in users to their role home and guests to login.
 * Uses cached user immediately — no full-screen auth spinner on `/`.
 */
export function RoleHomeRedirect() {
  const router = useRouter();
  const { user, isAuthenticated, isInitialized } = useAuth();

  useLayoutEffect(() => {
    const cached = readCachedAuthUser();
    if (cached || (isAuthenticated && user)) {
      const roleUser = user ?? cached;
      if (!roleUser) return;
      const home =
        ROLE_DASHBOARD_ROUTES[roleUser.role.code as UserRole] ??
        ROUTES.DASHBOARD;
      router.replace(home);
    }
  }, [isAuthenticated, router, user]);

  useEffect(() => {
    if (!isInitialized) {
      return;
    }

    if (!isAuthenticated || !user) {
      router.replace(ROUTES.LOGIN);
      return;
    }

    const home =
      ROLE_DASHBOARD_ROUTES[user.role.code as UserRole] ?? ROUTES.DASHBOARD;
    router.replace(home);
  }, [isAuthenticated, isInitialized, router, user]);

  // Transparent — never block with "Checking authentication".
  return null;
}
