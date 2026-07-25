import {
  AUTH_ERROR_CODES,
  RECAPTCHA,
} from "@enterprise/shared";

import { AuthError } from "../auth/auth.errors.js";
import { SECURITY_ERROR_CODES, SecurityError } from "./security.errors.js";
import { SECURITY_MESSAGES } from "./security.constants.js";

interface RecaptchaVerifyResult {
  success: boolean;
  score?: number;
  action?: string;
  hostname?: string;
  "error-codes"?: string[];
}

/**
 * Google reCAPTCHA v3 verification.
 * When RECAPTCHA_SECRET_KEY is unset, verification is skipped in non-production
 * so local development keeps working without keys.
 */
export class RecaptchaService {
  isEnabled(): boolean {
    return Boolean(process.env.RECAPTCHA_SECRET_KEY?.trim());
  }

  isRequired(): boolean {
    if (!this.isEnabled()) {
      return process.env.NODE_ENV === "production";
    }
    return true;
  }

  async verify(input: {
    token?: string | null;
    expectedAction: string;
    remoteIp?: string;
  }): Promise<void> {
    if (!this.isEnabled()) {
      if (process.env.NODE_ENV === "production") {
        throw new SecurityError(
          "reCAPTCHA is not configured",
          503,
          SECURITY_ERROR_CODES.CAPTCHA_FAILED,
        );
      }
      return;
    }

    if (!input.token) {
      throw new AuthError(
        SECURITY_MESSAGES.CAPTCHA_FAILED,
        400,
        AUTH_ERROR_CODES.CAPTCHA_FAILED,
      );
    }

    const secret = process.env.RECAPTCHA_SECRET_KEY!.trim();
    const body = new URLSearchParams({
      secret,
      response: input.token,
    });
    if (input.remoteIp) {
      body.set("remoteip", input.remoteIp);
    }

    let result: RecaptchaVerifyResult;
    try {
      const response = await fetch(
        "https://www.google.com/recaptcha/api/siteverify",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body,
        },
      );
      result = (await response.json()) as RecaptchaVerifyResult;
    } catch {
      throw new AuthError(
        SECURITY_MESSAGES.CAPTCHA_FAILED,
        502,
        AUTH_ERROR_CODES.CAPTCHA_FAILED,
      );
    }

    const minScore = Number(process.env.RECAPTCHA_MIN_SCORE ?? RECAPTCHA.MIN_SCORE);
    const scoreOk =
      typeof result.score !== "number" || result.score >= minScore;
    const actionOk =
      !result.action || result.action === input.expectedAction;

    if (!result.success || !scoreOk || !actionOk) {
      throw new AuthError(
        SECURITY_MESSAGES.CAPTCHA_FAILED,
        400,
        AUTH_ERROR_CODES.CAPTCHA_FAILED,
      );
    }
  }
}

export const recaptchaService = new RecaptchaService();
