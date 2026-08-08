import type { NextFunction, Request, Response } from "express";

import { AppError } from "../../errors/app-error.js";
import { isApiZeroTrustEnabled, isApiZeroTrustEnforcementEnabled } from "../../../config/security-flags.js";
import {
  ZERO_TRUST_STEP_UP_EXEMPT_PATHS,
} from "./zero-trust.policies.js";
import { zeroTrustService, ZERO_TRUST_ERROR_CODES } from "./zero-trust.service.js";
import type { RequestTrustResult } from "./zero-trust.types.js";

function requestPath(req: Request): string {
  const base = req.baseUrl ?? "";
  const path = req.path ?? "";
  const combined = `${base}${path}`.replace(/\/{2,}/g, "/");
  // Strip API prefix variants for classification matching
  return combined.replace(/^\/api\/v\d+/, "") || combined;
}

/**
 * Continuous Zero Trust evaluation after authentication.
 * Attaches req.zeroTrust; enforces BLOCK / REQUIRE_STEP_UP when enforcement is on.
 */
export async function evaluateZeroTrust(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!isApiZeroTrustEnabled()) {
      next();
      return;
    }

    if (!req.auth) {
      next();
      return;
    }

    const path = requestPath(req);
    const preload = (
      req as Request & {
        zeroTrustPreload?: {
          session: {
            id: string;
            userId: string;
            ipAddress: string | null;
            userAgent: string | null;
            revokedAt: Date | null;
            createdAt: Date;
            lastActiveAt: Date;
          };
          user: {
            id: string;
            status: string;
            passwordChangedAt: Date | null;
            twoFactorEnabled: boolean;
            lockedUntil: Date | null;
          };
        };
      }
    ).zeroTrustPreload;

    const context = {
      path,
      method: req.method,
      ipAddress: req.ip ?? null,
      userAgent: req.get("user-agent") ?? null,
      deviceFingerprint:
        typeof req.headers["x-device-fingerprint"] === "string"
          ? req.headers["x-device-fingerprint"]
          : null,
      preloaded: preload,
    };

    const result = await zeroTrustService.evaluateRequestTrust(
      {
        userId: req.auth.userId,
        email: req.auth.email,
        role: req.auth.role,
        permissions: req.auth.permissions,
        sessionId: req.auth.sessionId,
      },
      context,
    );

    req.zeroTrust = result;

    const shouldAudit =
      result.decision === "ALLOW_AUDIT" ||
      result.decision === "REQUIRE_STEP_UP" ||
      result.decision === "BLOCK";

    if (shouldAudit) {
      void zeroTrustService.auditEvaluation(
        {
          userId: req.auth.userId,
          email: req.auth.email,
          role: req.auth.role,
          permissions: req.auth.permissions,
          sessionId: req.auth.sessionId,
        },
        result,
        context,
      );
    }

    if (!isApiZeroTrustEnforcementEnabled()) {
      next();
      return;
    }

    const exempt = ZERO_TRUST_STEP_UP_EXEMPT_PATHS.some(
      (p) => path === p || path.endsWith(p),
    );
    if (exempt) {
      next();
      return;
    }

    if (result.decision === "BLOCK") {
      const code =
        result.riskLevel === "CRITICAL"
          ? ZERO_TRUST_ERROR_CODES.CRITICAL_BLOCK
          : ZERO_TRUST_ERROR_CODES.TRUST_DENIED;
      throw new AppError(result.reason, 403, code, [
        { field: "requiresStepUp", message: "false", code: "requiresStepUp" },
        { field: "reason", message: result.reason, code: "reason" },
        { field: "riskLevel", message: result.riskLevel, code: "riskLevel" },
      ]);
    }

    if (result.decision === "REQUIRE_STEP_UP" || result.requiresStepUp) {
      throw new AppError(result.reason, 403, ZERO_TRUST_ERROR_CODES.STEP_UP_REQUIRED, [
        { field: "requiresStepUp", message: "true", code: "requiresStepUp" },
        { field: "reason", message: result.reason, code: "reason" },
        { field: "riskLevel", message: result.riskLevel, code: "riskLevel" },
      ]);
    }

    next();
  } catch (error) {
    next(error);
  }
}

export type { RequestTrustResult };
