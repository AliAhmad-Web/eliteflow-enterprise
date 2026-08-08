/**
 * Enterprise CSRF Express middleware.
 * Thin wrapper — all logic lives in CsrfService.
 */

import type { NextFunction, Request, Response } from "express";

import { AUTH_ERROR_CODES, AUTH_HEADERS } from "@enterprise/shared";

import { AuthError } from "../../../modules/auth/auth.errors.js";
import { verifyAccessToken } from "../../../modules/auth/auth.tokens.js";
import { SECURITY_MESSAGES } from "../../../modules/security/security.constants.js";
import {
  CSRF_EXEMPT_PATH_PATTERNS,
  CSRF_SAFE_METHODS,
} from "./csrf.constants.js";
import { csrfService } from "./csrf.service.js";
import type { CsrfBinding } from "./csrf.types.js";

function requestPath(req: Request): string {
  // Prefer originalUrl without query; fall back to path.
  const raw = req.originalUrl?.split("?")[0] ?? req.path ?? "";
  return raw;
}

function isExemptPath(req: Request): boolean {
  const path = requestPath(req);
  if (CSRF_EXEMPT_PATH_PATTERNS.some((re) => re.test(path))) {
    return true;
  }

  // SSE: Accept header or event-stream content negotiation.
  const accept = req.get("accept") ?? "";
  if (accept.toLowerCase().includes("text/event-stream")) {
    return true;
  }

  // WebSocket upgrade
  const upgrade = req.get("upgrade");
  if (upgrade && upgrade.toLowerCase() === "websocket") {
    return true;
  }

  return false;
}

function extractBindingFromRequest(req: Request): Partial<CsrfBinding> | null {
  if (req.auth) {
    return {
      sessionId: req.auth.sessionId,
      userId: req.auth.userId,
      tenantId: null,
    };
  }

  const header = req.get(AUTH_HEADERS.AUTHORIZATION);
  if (!header?.startsWith(AUTH_HEADERS.BEARER_PREFIX)) {
    return null;
  }

  const token = header.slice(AUTH_HEADERS.BEARER_PREFIX.length).trim();
  if (!token) return null;

  try {
    const payload = verifyAccessToken(token);
    return {
      sessionId: payload.sessionId,
      userId: payload.sub,
      tenantId: null,
    };
  } catch {
    return null;
  }
}

/**
 * Global CSRF protection middleware.
 * Validates POST/PUT/PATCH/DELETE only (non-exempt).
 */
export function csrfProtection(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  void (async () => {
    try {
      if (!csrfService.isEnabled()) {
        next();
        return;
      }

      if (CSRF_SAFE_METHODS.has(req.method.toUpperCase())) {
        next();
        return;
      }

      if (isExemptPath(req)) {
        next();
        return;
      }

      const cookieToken = csrfService.readCookie(req);

      // Bearer-only / pre-bootstrap: no CSRF cookie yet → allow (BC).
      if (!cookieToken) {
        next();
        return;
      }

      const headerToken = csrfService.readHeader(req);
      const result = await csrfService.validate({
        cookieToken,
        headerToken,
        binding: extractBindingFromRequest(req),
      });

      if (!result.ok) {
        csrfService.reportFailure({ reason: result.reason, req });
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
    } catch (err) {
      next(err);
    }
  })();
}

/**
 * Issue CSRF token (controller helper — delegates to service).
 * Kept for BC with securityController.csrfToken.
 */
export async function issueCsrfToken(
  req: Request,
  res: Response,
  binding?: Partial<CsrfBinding>,
): Promise<string> {
  const result = await csrfService.issue(res, {
    binding,
    previousToken: csrfService.readCookie(req),
  });
  return result.token;
}

export function readCsrfCookie(req: Request): string | undefined {
  return csrfService.readCookie(req);
}
