import { createHash, randomBytes } from "node:crypto";

import type { AccessTokenPayload, UserRole } from "@enterprise/shared";
import { AUTH_ERROR_CODES, TOKEN_EXPIRATION } from "@enterprise/shared";
import jwt from "jsonwebtoken";

import { authConfig } from "../../config/auth.config.js";

import { AuthError } from "./auth.errors.js";

export interface AccessTokenInput {
  userId: string;
  email: string;
  role: UserRole;
  permissions: string[];
  sessionId: string;
}

export function generateOpaqueRefreshToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateAccessToken(input: AccessTokenInput): string {
  const payload: Omit<AccessTokenPayload, "iat" | "exp"> = {
    sub: input.userId,
    email: input.email,
    role: input.role,
    permissions: input.permissions,
    sessionId: input.sessionId,
    iss: authConfig.jwtIssuer,
    aud: authConfig.jwtAudience,
  };

  return jwt.sign(payload, authConfig.jwtSecret, {
    algorithm: "HS256",
    expiresIn: TOKEN_EXPIRATION.ACCESS_TOKEN_SECONDS,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, authConfig.jwtSecret, {
      algorithms: ["HS256"],
      issuer: authConfig.jwtIssuer,
      audience: authConfig.jwtAudience,
    });

    if (typeof decoded === "string" || !decoded || typeof decoded !== "object") {
      throw new AuthError("Invalid access token", 401, AUTH_ERROR_CODES.TOKEN_INVALID);
    }

    const payload = decoded as AccessTokenPayload;

    if (
      !payload.sub ||
      !payload.email ||
      !payload.role ||
      !Array.isArray(payload.permissions) ||
      !payload.sessionId
    ) {
      throw new AuthError("Invalid access token payload", 401, AUTH_ERROR_CODES.TOKEN_INVALID);
    }

    return payload;
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }

    if (error instanceof jwt.TokenExpiredError) {
      throw new AuthError("Access token expired", 401, AUTH_ERROR_CODES.TOKEN_EXPIRED);
    }

    throw new AuthError("Invalid access token", 401, AUTH_ERROR_CODES.TOKEN_INVALID);
  }
}

export function getAccessTokenExpiresIn(): number {
  return TOKEN_EXPIRATION.ACCESS_TOKEN_SECONDS;
}

export function getRefreshTokenExpiresAt(rememberMe = false): Date {
  const seconds = rememberMe
    ? TOKEN_EXPIRATION.REFRESH_TOKEN_SECONDS_REMEMBER_ME
    : TOKEN_EXPIRATION.REFRESH_TOKEN_SECONDS;
  return new Date(Date.now() + seconds * 1000);
}

export function getPasswordResetExpiresAt(): Date {
  return new Date(
    Date.now() + TOKEN_EXPIRATION.PASSWORD_SETUP_MINUTES * 60 * 1000,
  );
}

export function getEmailVerificationExpiresAt(): Date {
  return new Date(
    Date.now() + TOKEN_EXPIRATION.EMAIL_VERIFICATION_HOURS * 60 * 60 * 1000,
  );
}

/** SHA-256 hash for opaque single-use tokens (reset, verification). */
export function hashOpaqueToken(token: string): string {
  return hashRefreshToken(token);
}
