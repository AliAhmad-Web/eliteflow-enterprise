import type { NextFunction, Request, Response } from "express";

import { RECAPTCHA } from "@enterprise/shared";

import { recaptchaService } from "../modules/security/recaptcha.service.js";

function readCaptchaToken(req: Request): string | undefined {
  const body = req.body as Record<string, unknown> | undefined;
  const header = req.get("X-Recaptcha-Token");
  if (typeof header === "string" && header.trim()) {
    return header.trim();
  }
  if (typeof body?.captchaToken === "string") {
    return body.captchaToken.trim();
  }
  return undefined;
}

export function requireRecaptcha(expectedAction: string) {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      await recaptchaService.verify({
        token: readCaptchaToken(req),
        expectedAction,
        remoteIp: req.ip,
      });
      next();
    } catch (error) {
      next(error);
    }
  };
}

export { RECAPTCHA };
