"use client";

import {
  DASHBOARD_ROLES,
  ROLE_DASHBOARD_ROUTES,
  type UserRole,
} from "@enterprise/shared";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { RedirectFallback } from "@/components/common/feedback/redirect-fallback";
import { ROUTES } from "@/constants/routes";
import { useAuthStore } from "@/features/auth/stores/auth.store";
import { usePermissions, useRole } from "@/features/rbac/hooks/use-permissions";

interface RoleRouteGuardProps {
  children: React.ReactNode;
  allowedRoles: readonly UserRole[];
  /** Optional permission required in addition to role */
  requiredPermission?: string;
}

export function RoleRouteGuard({
  children,
  allowedRoles,
  requiredPermission,
}: RoleRouteGuardProps) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const user = useAuthStore((state) => state.user);
  const { hasRole } = useRole();
  const { hasPermission } = usePermissions();
  const redirectedRef = useRef(false);
  const [redirectTimedOut, setRedirectTimedOut] = useState(false);

  const roleAllowed = !user ? !isInitialized : hasRole(...allowedRoles);
  const permissionAllowed = requiredPermission
    ? !user
      ? !isInitialized
      : hasPermission(requiredPermission)
    : true;
  const allowed = roleAllowed && permissionAllowed;

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
    router.replace(fallback);

    const timeout = window.setTimeout(() => {
      setRedirectTimedOut(true);
    }, 4_000);

    return () => window.clearTimeout(timeout);
  }, [allowed, isAuthenticated, isInitialized, router, user]);

  if (isInitialized && !isAuthenticated) {
    return null;
  }

  if (isInitialized && !allowed) {
    const fallback =
      (user && ROLE_DASHBOARD_ROUTES[user.role.code as UserRole]) ||
      ROUTES.LOGIN;

    return (
      <RedirectFallback
        label="Redirecting to your home"
        timedOut={redirectTimedOut}
        timeoutMessage="Unable to open this page for your role."
        actionLabel="Go to my home"
        onAction={() => window.location.assign(fallback)}
      />
    );
  }

  return children;
}

export function DashboardRoleGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleRouteGuard allowedRoles={DASHBOARD_ROLES}>{children}</RoleRouteGuard>
  );
}
