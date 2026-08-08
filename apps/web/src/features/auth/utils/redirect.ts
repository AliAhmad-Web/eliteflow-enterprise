import {
  ROLE_DASHBOARD_ROUTES,
  UserRole,
  type UserRole as UserRoleType,
} from "@enterprise/shared";

import { ROUTES } from "@/constants/routes";

const AVAILABLE_ROUTES = new Set<string>([
  ROUTES.ADMIN,
  ROUTES.PORTAL,
  ROUTES.DASHBOARD,
  ROUTES.WORKSPACE,
  ROUTES.CLIENTS,
  ROUTES.PROJECTS,
  ROUTES.TASKS,
  ROUTES.INVOICES,
  ROUTES.REPORTS,
  ROUTES.CALENDAR,
  ROUTES.AI_ASSISTANT,
  ROUTES.AI_DOCUMENTS,
  ROUTES.FILE_MANAGER,
  ROUTES.FILES,
  ROUTES.TEAM,
  ROUTES.NOTIFICATIONS,
  ROUTES.MESSAGES,
  ROUTES.ACTIVITY,
  ROUTES.SETTINGS,
  ROUTES.SETTINGS_SECURITY,
  ROUTES.SETTINGS_SESSIONS,
]);

/** Role-exclusive home routes — never send a different role here via ?redirect= */
const ROLE_HOME_ROUTES = new Set<string>([
  ROUTES.ADMIN,
  ROUTES.DASHBOARD,
  ROUTES.WORKSPACE,
  ROUTES.PORTAL,
]);

function matchesRoute(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}

function isAllowedRedirect(path: string): boolean {
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) {
    return false;
  }

  if (
    path.startsWith("/login") ||
    path.startsWith("/signup") ||
    path.startsWith("/forgot-password") ||
    path.startsWith("/reset-password") ||
    path.startsWith("/auth/")
  ) {
    return false;
  }

  for (const route of AVAILABLE_ROUTES) {
    if (matchesRoute(path, route)) {
      return true;
    }
  }

  return false;
}

/**
 * Only honor ?redirect= when the destination is valid for this role.
 * Prevents Client/Employee from being sent to /dashboard (and bounce loops).
 */
function isRedirectAllowedForRole(role: UserRoleType, path: string): boolean {
  const roleHome = ROLE_DASHBOARD_ROUTES[role];

  if (ROLE_HOME_ROUTES.has(path) && path !== roleHome) {
    return false;
  }

  switch (role) {
    case UserRole.CLIENT:
      return (
        matchesRoute(path, ROUTES.PORTAL) ||
        matchesRoute(path, ROUTES.PROJECTS) ||
        matchesRoute(path, ROUTES.INVOICES) ||
        matchesRoute(path, ROUTES.FILE_MANAGER) ||
        matchesRoute(path, ROUTES.FILES) ||
        matchesRoute(path, ROUTES.CALENDAR) ||
        matchesRoute(path, ROUTES.MESSAGES) ||
        matchesRoute(path, ROUTES.ACTIVITY) ||
        matchesRoute(path, ROUTES.NOTIFICATIONS) ||
        matchesRoute(path, ROUTES.SETTINGS)
      );
    case UserRole.EMPLOYEE:
      return (
        !matchesRoute(path, ROUTES.ADMIN) &&
        !matchesRoute(path, ROUTES.DASHBOARD) &&
        !matchesRoute(path, ROUTES.PORTAL)
      );
    case UserRole.ADMIN:
      return (
        !matchesRoute(path, ROUTES.ADMIN) &&
        !matchesRoute(path, ROUTES.WORKSPACE) &&
        !matchesRoute(path, ROUTES.PORTAL)
      );
    case UserRole.SUPER_ADMIN:
      return !matchesRoute(path, ROUTES.PORTAL) && !matchesRoute(path, ROUTES.WORKSPACE);
    default:
      return false;
  }
}

export function getPostLoginRedirect(
  role: UserRoleType,
  requestedRedirect?: string | null,
): string {
  const roleHome = ROLE_DASHBOARD_ROUTES[role] ?? ROUTES.DASHBOARD;

  if (
    requestedRedirect &&
    isAllowedRedirect(requestedRedirect) &&
    isRedirectAllowedForRole(role, requestedRedirect)
  ) {
    return requestedRedirect;
  }

  return AVAILABLE_ROUTES.has(roleHome) ? roleHome : ROUTES.DASHBOARD;
}
