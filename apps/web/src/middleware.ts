import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { ROUTES } from "@/constants/routes";
import { getSessionHintCookieName } from "@/features/auth/utils/session-hint";

const PROTECTED_ROUTE_PREFIXES = [
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
  ROUTES.TEAM,
  ROUTES.NOTIFICATIONS,
  ROUTES.MESSAGES,
  ROUTES.CHANNELS,
  ROUTES.ANNOUNCEMENTS,
  ROUTES.THREADS,
  ROUTES.MEETINGS,
  ROUTES.ACTIVITY,
  ROUTES.INTEGRATIONS,
  ROUTES.SECURITY,
  ROUTES.SETTINGS,
] as const;

function matchesRoute(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSessionHint = request.cookies.has(getSessionHintCookieName());

  const isProtectedRoute = PROTECTED_ROUTE_PREFIXES.some((route) =>
    matchesRoute(pathname, route),
  );

  // Only gate protected pages. Do NOT bounce auth pages to /dashboard based on
  // the session-hint cookie — a stale hint causes login ↔ dashboard loops and
  // leaves the Next.js "Rendering..." indicator stuck. AuthGuestGuard handles
  // redirecting already-authenticated users away from login/signup.
  if (isProtectedRoute && !hasSessionHint) {
    const loginUrl = new URL(ROUTES.LOGIN, request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
    "/admin",
    "/admin/:path*",
    "/portal",
    "/portal/:path*",
    "/dashboard",
    "/dashboard/:path*",
    "/workspace",
    "/workspace/:path*",
    "/clients",
    "/clients/:path*",
    "/projects",
    "/projects/:path*",
    "/tasks",
    "/tasks/:path*",
    "/invoices",
    "/invoices/:path*",
    "/reports",
    "/reports/:path*",
    "/calendar",
    "/calendar/:path*",
    "/ai-assistant",
    "/ai-assistant/:path*",
    "/ai-documents",
    "/ai-documents/:path*",
    "/file-manager",
    "/file-manager/:path*",
    "/team",
    "/team/:path*",
    "/notifications",
    "/notifications/:path*",
    "/messages",
    "/messages/:path*",
    "/channels",
    "/channels/:path*",
    "/announcements",
    "/announcements/:path*",
    "/threads",
    "/threads/:path*",
    "/meetings",
    "/meetings/:path*",
    "/activity",
    "/activity/:path*",
    "/integrations",
    "/integrations/:path*",
    "/security",
    "/security/:path*",
    "/settings",
    "/settings/:path*",
  ],
};
