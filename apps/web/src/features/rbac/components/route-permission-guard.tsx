"use client";

import {
  ROLE_DASHBOARD_ROUTES,
  canAccessRoute,
  type UserRole,
} from "@enterprise/shared";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { RedirectFallback } from "@/components/common/feedback/redirect-fallback";
import { ROUTES } from "@/constants/routes";
import { useAuthStore } from "@/features/auth/stores/auth.store";
import { usePermissions } from "@/features/rbac/hooks/use-permissions";

interface RoutePermissionGuardProps {
  children: React.ReactNode;
}

/**
 * Enforces ROUTE_PERMISSIONS for the current pathname.
 * Does not blank the shell while auth is bootstrapping — only redirects after
 * init when access is denied.
 */
export function RoutePermissionGuard({ children }: RoutePermissionGuardProps) {
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const user = useAuthStore((state) => state.user);
  const { subject } = usePermissions();
  const redirectedRef = useRef(false);
  const [redirectTimedOut, setRedirectTimedOut] = useState(false);

  const allowed = useMemo(() => {
    // Optimistic: while session bootstrap runs, keep the current shell mounted.
    if (!isInitialized && !subject) {
      return true;
    }
    return canAccessRoute(subject, pathname);
  }, [subject, pathname, isInitialized]);

  useEffect(() => {
    if (!isInitialized || !isAuthenticated || !user || allowed) {
      redirectedRef.current = false;
      setRedirectTimedOut(false);
      return;
    }

    if (redirectedRef.current) {
      return;
    }

    redirectedRef.current = true;
    const fallback =
      ROLE_DASHBOARD_ROUTES[user.role.code as UserRole] ?? ROUTES.DASHBOARD;
    window.location.assign(fallback);

    const timeout = window.setTimeout(() => {
      setRedirectTimedOut(true);
    }, 4_000);

    return () => window.clearTimeout(timeout);
  }, [allowed, isAuthenticated, isInitialized, user]);

  if (isInitialized && !isAuthenticated) {
    return null;
  }

  if (isInitialized && !allowed) {
    const fallback =
      (user && ROLE_DASHBOARD_ROUTES[user.role.code as UserRole]) || ROUTES.LOGIN;

    return (
      <RedirectFallback
        label="Redirecting to your home"
        timedOut={redirectTimedOut}
        timeoutMessage="You do not have access to this page."
        actionLabel="Go to my home"
        onAction={() => window.location.assign(fallback)}
      />
    );
  }

  return children;
}
