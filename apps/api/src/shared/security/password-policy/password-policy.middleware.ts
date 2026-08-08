import type { NextFunction, Request, Response } from "express";

import { passwordPolicyService } from "./password-policy.service.js";

/**
 * Post-authentication guard: blocks protected APIs when password change is required.
 * Must run after req.auth is set and before authorization / business handlers.
 */
export async function enforceForcedPasswordChange(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.auth?.userId) {
      next();
      return;
    }

    const path = passwordPolicyService.resolveRequestPath(
      req.baseUrl ?? "",
      req.path ?? "",
    );

    await passwordPolicyService.enforcePasswordChange({
      userId: req.auth.userId,
      method: req.method,
      path,
      ipAddress: req.ip ?? null,
      userAgent: req.get("user-agent") ?? null,
    });

    next();
  } catch (error) {
    next(error);
  }
}
