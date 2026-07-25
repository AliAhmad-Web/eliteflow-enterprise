import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import {
  INTEGRATIONS_ERROR_CODES,
  IntegrationsError,
} from "../integrations.errors.js";
import { requireOAuthStateSecret, type OAuthSlug } from "./oauth-config.js";
import { createPkcePair } from "./pkce.js";

export interface OAuthStatePayload {
  userId: string;
  slug: OAuthSlug;
  nonce: string;
  exp: number;
  /** PKCE code_verifier — single-use, never logged. */
  codeVerifier: string;
}

function sign(payloadB64: string): string {
  return createHmac("sha256", requireOAuthStateSecret())
    .update(payloadB64)
    .digest("base64url");
}

/**
 * Signed OAuth `state` with embedded PKCE verifier.
 * Validates CSRF, binds callback to the acting admin, and carries PKCE.
 */
export function createOAuthState(input: {
  userId: string;
  slug: OAuthSlug;
  ttlSeconds?: number;
}): { state: string; codeChallenge: string } {
  const { codeVerifier, codeChallenge } = createPkcePair();
  const payload: OAuthStatePayload = {
    userId: input.userId,
    slug: input.slug,
    nonce: randomBytes(16).toString("hex"),
    exp: Math.floor(Date.now() / 1000) + (input.ttlSeconds ?? 600),
    codeVerifier,
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  return {
    state: `${payloadB64}.${sign(payloadB64)}`,
    codeChallenge,
  };
}

export function verifyOAuthState(state: string): OAuthStatePayload {
  const [payloadB64, signature] = state.split(".");
  if (!payloadB64 || !signature) {
    throw new IntegrationsError(
      "Invalid OAuth state",
      400,
      INTEGRATIONS_ERROR_CODES.VALIDATION,
    );
  }

  const expected = sign(payloadB64);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new IntegrationsError(
      "OAuth state signature mismatch",
      400,
      INTEGRATIONS_ERROR_CODES.VALIDATION,
    );
  }

  let payload: OAuthStatePayload;
  try {
    payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8"),
    ) as OAuthStatePayload;
  } catch {
    throw new IntegrationsError(
      "OAuth state payload is invalid",
      400,
      INTEGRATIONS_ERROR_CODES.VALIDATION,
    );
  }

  if (
    !payload.userId ||
    !payload.slug ||
    !payload.exp ||
    !payload.codeVerifier
  ) {
    throw new IntegrationsError(
      "OAuth state is incomplete",
      400,
      INTEGRATIONS_ERROR_CODES.VALIDATION,
    );
  }

  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new IntegrationsError(
      "OAuth state has expired — please reconnect",
      400,
      INTEGRATIONS_ERROR_CODES.VALIDATION,
    );
  }

  return payload;
}
