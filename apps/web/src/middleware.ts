import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { ROUTES } from "@/constants/routes";
import {
  getSessionHintCookieName,
  isValidSessionHintValue,
} from "@/features/auth/utils/session-hint";
import { isSecuritySessionHardeningEnabled } from "@/features/security/feature-flags";

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
  ROUTES.WHITEBOARD,
  ROUTES.AI_ASSISTANT,
  ROUTES.AI_DOCUMENTS,
  ROUTES.FILE_MANAGER,
  ROUTES.FILES,
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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Supabase Site URL fallback often lands OAuth `?code=` on `/` (or another
  // non-callback route) when `/auth/callback` is missing from the allow-list.
  // Forward those params to the callback handler so social login can complete.
  if (pathname !== ROUTES.AUTH_CALLBACK) {
    const params = request.nextUrl.searchParams;
    if (
      params.has("code") ||
      params.has("access_token") ||
      params.has("error_description") ||
      (params.has("error") && params.has("state"))
    ) {
      const callbackUrl = request.nextUrl.clone();
      callbackUrl.pathname = ROUTES.AUTH_CALLBACK;
      return NextResponse.redirect(callbackUrl);
    }
  }

  const hintName = getSessionHintCookieName();
  const hintValue = request.cookies.get(hintName)?.value;

  let hasSessionHint = Boolean(hintValue);

  if (isSecuritySessionHardeningEnabled()) {
    hasSessionHint = await isValidSessionHintValue(hintValue);
  }

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
    /*
     * Run on app pages so OAuth `?code=` on Site URL (`/`) is forwarded to
     * `/auth/callback`. Skip static assets and Next internals.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|json)$).*)",
  ],
};
