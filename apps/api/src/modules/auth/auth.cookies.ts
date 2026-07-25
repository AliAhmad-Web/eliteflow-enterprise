import type { CookieOptions, Request, Response } from "express";

import { AUTH_COOKIES, TOKEN_EXPIRATION } from "@enterprise/shared";

import { authConfig } from "../../config/auth.config.js";

export function getRefreshTokenCookieName(): string {
  return authConfig.isProduction
    ? AUTH_COOKIES.REFRESH_TOKEN
    : AUTH_COOKIES.REFRESH_TOKEN_DEV;
}

function getRefreshTokenCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: authConfig.isProduction,
    sameSite: "lax",
    path: "/api/v1/auth",
    maxAge: TOKEN_EXPIRATION.REFRESH_TOKEN_SECONDS * 1000,
  };
}

export function setRefreshTokenCookie(res: Response, token: string): void {
  res.cookie(getRefreshTokenCookieName(), token, getRefreshTokenCookieOptions());
}

export function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie(getRefreshTokenCookieName(), {
    httpOnly: true,
    secure: authConfig.isProduction,
    sameSite: "lax",
    path: "/api/v1/auth",
  });
}

export function getRefreshTokenFromRequest(req: Request): string | undefined {
  const cookieName = getRefreshTokenCookieName();
  const cookies = req.cookies as Record<string, string | undefined> | undefined;
  const cookieToken = cookies?.[cookieName];

  if (cookieToken) {
    return cookieToken;
  }

  // Body refresh tokens are rejected in production (XSS-exfiltrable).
  // Dev/test may still send them for API tooling without a browser cookie jar.
  if (authConfig.isProduction) {
    return undefined;
  }

  const body = req.body as { refreshToken?: string } | undefined;
  return body?.refreshToken;
}
