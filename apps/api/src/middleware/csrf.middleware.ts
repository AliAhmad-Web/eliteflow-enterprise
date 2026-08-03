import type { NextFunction, Request, Response } from "express";
import { randomBytes } from "node:crypto";

import {
  AUTH_COOKIES,
  AUTH_ERROR_CODES,
  AUTH_HEADERS,
} from "@enterprise/shared";

import { isApiSecuritySecureCookiesEnabled } from "../config/security-flags.js";
import { AuthError } from "../modules/auth/auth.errors.js";
import { SECURITY_MESSAGES } from "../modules/security/security.constants.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function csrfCookieName(): string {
  return isProduction()
    ? AUTH_COOKIES.CSRF_TOKEN
    : AUTH_COOKIES.CSRF_TOKEN_DEV;
}

export function issueCsrfToken(res: Response): string {
  const token = randomBytes(32).toString("hex");
  const hardenCookies = isApiSecuritySecureCookiesEnabled();
  // Cross-site web→API needs SameSite=None; Secure (align with refresh cookie).
  const crossSite = isProduction() && hardenCookies;

  res.cookie(csrfCookieName(), token, {
    httpOnly: false,
    secure: isProduction(),
    sameSite: crossSite ? "none" : isProduction() ? "strict" : "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  return token;
}

export function readCsrfCookie(req: Request): string | undefined {
  const cookies = req.cookies as Record<string, string> | undefined;
  return cookies?.[csrfCookieName()];
}

/**
 * Double-submit CSRF protection for cookie-authenticated state changes.
 * Bearer-token API clients send X-CSRF-Token matching the readable cookie.
 * Skipped when no CSRF cookie is present (pure Bearer clients without cookie).
 */
export function csrfProtection(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (SAFE_METHODS.has(req.method.toUpperCase())) {
    next();
    return;
  }

  const cookieToken = readCsrfCookie(req);
  if (!cookieToken) {
    // No CSRF cookie issued yet — allow Bearer-only clients.
    next();
    return;
  }

  const headerToken = req.get(AUTH_HEADERS.CSRF_TOKEN);
  if (!headerToken || headerToken !== cookieToken) {
    next(
      new AuthError(
        SECURITY_MESSAGES.CSRF_INVALID,
        403,
        AUTH_ERROR_CODES.CSRF_INVALID,
      ),
    );
    return;
  }

  next();
}
