import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

import { OTP_RULES, OtpPurpose } from "@enterprise/shared";

import { authConfig } from "../../config/auth.config.js";

export function generateOtpCode(): string {
  return randomInt(100_000, 1_000_000).toString();
}

/**
 * HMAC-SHA256 of the OTP code using the JWT secret as pepper.
 * Plain SHA-256 of a 6-digit code is brute-forceable if the DB is leaked.
 */
export function hashOtpCode(code: string): string {
  return createHmac("sha256", authConfig.jwtSecret)
    .update(`otp:${code}`)
    .digest("hex");
}

export function verifyOtpCodeHash(code: string, storedHash: string): boolean {
  const providedHash = hashOtpCode(code);
  const providedBuffer = Buffer.from(providedHash, "hex");
  const storedBuffer = Buffer.from(storedHash, "hex");

  if (providedBuffer.length !== storedBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, storedBuffer);
}

export function getOtpExpiresAt(purpose: OtpPurpose): Date {
  const minutes =
    purpose === OtpPurpose.SENSITIVE_ACTION
      ? OTP_RULES.EXPIRY_MINUTES_SENSITIVE
      : OTP_RULES.EXPIRY_MINUTES_LOGIN;

  return new Date(Date.now() + minutes * 60 * 1000);
}

export function getOtpExpiresInSeconds(purpose: OtpPurpose): number {
  const minutes =
    purpose === OtpPurpose.SENSITIVE_ACTION
      ? OTP_RULES.EXPIRY_MINUTES_SENSITIVE
      : OTP_RULES.EXPIRY_MINUTES_LOGIN;

  return minutes * 60;
}
