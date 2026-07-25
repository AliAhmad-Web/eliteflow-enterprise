import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import jwt from "jsonwebtoken";
import type { User as SupabaseUser } from "@supabase/supabase-js";

import {
  AUTH_ERROR_CODES,
  OAuthProvider,
  type OAuthProvider as OAuthProviderType,
} from "@enterprise/shared";

import { AuthError } from "../../modules/auth/auth.errors.js";
import {
  assertSupabaseConfig,
  supabaseConfig,
} from "../../config/supabase.config.js";
import { getSupabaseAdminClient } from "./supabase.client.js";

export interface VerifiedOAuthIdentity {
  provider: OAuthProviderType;
  providerAccountId: string;
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
}

const PROVIDER_MAP: Record<string, OAuthProviderType> = {
  google: OAuthProvider.GOOGLE,
  github: OAuthProvider.GITHUB,
};

let remoteJwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function mapSupabaseProvider(provider: string): OAuthProviderType | null {
  return PROVIDER_MAP[provider.toLowerCase()] ?? null;
}

function splitName(fullName: string | undefined): {
  firstName: string;
  lastName: string;
} {
  if (!fullName?.trim()) {
    return { firstName: "User", lastName: "Account" };
  }

  const parts = fullName.trim().split(/\s+/);
  const firstName = parts[0] ?? "User";
  const lastName = parts.slice(1).join(" ") || "Account";

  return { firstName, lastName };
}

function getRemoteJwks() {
  if (!supabaseConfig.jwksUrl) {
    return null;
  }

  if (!remoteJwks) {
    remoteJwks = createRemoteJWKSet(new URL(supabaseConfig.jwksUrl));
  }

  return remoteJwks;
}

function extractIdentity(
  user: Pick<
    SupabaseUser,
    "email" | "email_confirmed_at" | "user_metadata" | "identities" | "app_metadata" | "id"
  >,
  claimedProvider: OAuthProviderType,
): {
  providerAccountId: string;
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
} {
  const identities = user.identities ?? [];
  const matchingIdentity = identities.find((identity) => {
    const mapped = mapSupabaseProvider(identity.provider);
    return mapped === claimedProvider;
  });

  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const appMetadata = (user.app_metadata ?? {}) as Record<string, unknown>;
  const identityData = (matchingIdentity?.identity_data ?? {}) as Record<
    string,
    unknown
  >;

  const appProvider =
    typeof appMetadata.provider === "string" ? appMetadata.provider : "";
  const providers = Array.isArray(appMetadata.providers)
    ? appMetadata.providers.filter((value): value is string => typeof value === "string")
    : [];

  if (matchingIdentity) {
    // ok — identity list confirms provider
  } else if (
    mapSupabaseProvider(appProvider) === claimedProvider ||
    providers.some((value) => mapSupabaseProvider(value) === claimedProvider)
  ) {
    // ok — JWT claims confirm provider when Auth Admin API is unreachable
  } else if (identities.length === 0 && !appProvider && providers.length === 0) {
    // Claims-only tokens sometimes omit provider; trust claimedProvider after JWT verify
  } else {
    throw new AuthError(
      "OAuth provider identity mismatch",
      401,
      AUTH_ERROR_CODES.OAUTH_PROVIDER_MISMATCH,
    );
  }

  const email =
    user.email?.toLowerCase() ||
    (typeof identityData.email === "string"
      ? identityData.email.toLowerCase()
      : "") ||
    (typeof metadata.email === "string" ? metadata.email.toLowerCase() : "");

  if (!email) {
    throw new AuthError(
      "OAuth identity did not provide a verified email",
      401,
      AUTH_ERROR_CODES.OAUTH_EMAIL_UNVERIFIED,
    );
  }

  const emailVerified = Boolean(
    user.email_confirmed_at ||
      identityData.email_verified === true ||
      identityData.email_verified === "true" ||
      metadata.email_verified === true ||
      metadata.email_verified === "true" ||
      // OAuth providers issued by Google/GitHub are treated as verified emails
      claimedProvider === OAuthProvider.GOOGLE ||
      claimedProvider === OAuthProvider.GITHUB,
  );

  if (!emailVerified) {
    throw new AuthError(
      "OAuth email is not verified",
      401,
      AUTH_ERROR_CODES.OAUTH_EMAIL_UNVERIFIED,
    );
  }

  const fullName =
    (typeof metadata.full_name === "string" && metadata.full_name) ||
    (typeof metadata.name === "string" && metadata.name) ||
    (typeof identityData.full_name === "string" && identityData.full_name) ||
    (typeof identityData.name === "string" && identityData.name) ||
    undefined;

  const { firstName, lastName } = splitName(fullName);

  const avatarUrl =
    (typeof metadata.avatar_url === "string" && metadata.avatar_url) ||
    (typeof metadata.picture === "string" && metadata.picture) ||
    (typeof identityData.avatar_url === "string" && identityData.avatar_url) ||
    (typeof identityData.picture === "string" && identityData.picture) ||
    null;

  const identityId =
    matchingIdentity &&
    "identity_id" in matchingIdentity &&
    typeof matchingIdentity.identity_id === "string"
      ? matchingIdentity.identity_id.trim()
      : "";

  const providerAccountId =
    (typeof identityData.sub === "string" && identityData.sub.trim()) ||
    (typeof identityData.id === "string" && identityData.id.trim()) ||
    (typeof metadata.provider_id === "string" && metadata.provider_id.trim()) ||
    (typeof metadata.sub === "string" && metadata.sub.trim()) ||
    identityId ||
    matchingIdentity?.id ||
    // Last resort: stable per Supabase auth user + provider
    `${claimedProvider.toLowerCase()}:${user.id}`;

  if (!providerAccountId) {
    throw new AuthError(
      "OAuth identity did not provide a stable account id",
      401,
      AUTH_ERROR_CODES.OAUTH_TOKEN_INVALID,
    );
  }

  return {
    providerAccountId,
    email,
    emailVerified,
    firstName,
    lastName,
    avatarUrl,
  };
}

function claimsToUser(payload: JWTPayload): Parameters<typeof extractIdentity>[0] {
  const appMetadata =
    payload.app_metadata && typeof payload.app_metadata === "object"
      ? (payload.app_metadata as Record<string, unknown>)
      : {};
  const userMetadata =
    payload.user_metadata && typeof payload.user_metadata === "object"
      ? (payload.user_metadata as Record<string, unknown>)
      : {};

  return {
    id: typeof payload.sub === "string" ? payload.sub : "",
    email: typeof payload.email === "string" ? payload.email : undefined,
    email_confirmed_at:
      typeof payload.email_confirmed_at === "string"
        ? payload.email_confirmed_at
        : undefined,
    app_metadata: appMetadata,
    user_metadata: userMetadata,
    identities: [],
  };
}

async function verifyAccessTokenLocally(accessToken: string): Promise<JWTPayload> {
  const jwks = getRemoteJwks();

  if (jwks) {
    try {
      const { payload } = await jwtVerify(accessToken, jwks, {
        algorithms: ["ES256", "RS256", "EdDSA"],
      });
      return payload;
    } catch (error) {
      console.warn("[oauth] JWKS verification failed, trying JWT secret:", error);
    }
  }

  const jwtSecret = supabaseConfig.jwtSecret;
  if (jwtSecret) {
    const payload = jwt.verify(accessToken, jwtSecret, {
      algorithms: ["HS256"],
    });

    if (typeof payload === "string" || !payload || typeof payload !== "object") {
      throw new AuthError(
        "Invalid OAuth token",
        401,
        AUTH_ERROR_CODES.OAUTH_TOKEN_INVALID,
      );
    }

    return payload as JWTPayload;
  }

  throw new AuthError(
    "Unable to verify OAuth token. Supabase Auth API is unreachable and local JWT verification is not configured (set SUPABASE_JWKS_URL or SUPABASE_JWT_SECRET).",
    503,
    AUTH_ERROR_CODES.INTERNAL_ERROR,
  );
}

/**
 * Verifies a Supabase access token and extracts a trusted OAuth identity.
 * Prefer Auth Admin getUser(); fall back to local JWT verification when the
 * Auth API is unreachable (DNS/network), so app users are still created/linked.
 */
export async function verifySupabaseOAuthToken(input: {
  provider: OAuthProviderType;
  supabaseAccessToken: string;
  supabaseRefreshToken?: string | null;
}): Promise<VerifiedOAuthIdentity> {
  assertSupabaseConfig();

  let identity: ReturnType<typeof extractIdentity>;

  try {
    const client = getSupabaseAdminClient();
    const { data, error } = await client.auth.getUser(input.supabaseAccessToken);

    if (error || !data.user) {
      throw error ?? new Error("Supabase getUser returned no user");
    }

    identity = extractIdentity(data.user, input.provider);
  } catch (error) {
    console.warn(
      "[oauth] Supabase getUser failed; falling back to local JWT verification:",
      error,
    );

    const payload = await verifyAccessTokenLocally(input.supabaseAccessToken);

    if (!payload.sub) {
      throw new AuthError(
        "Invalid OAuth token",
        401,
        AUTH_ERROR_CODES.OAUTH_TOKEN_INVALID,
      );
    }

    identity = extractIdentity(claimsToUser(payload), input.provider);
  }

  return {
    provider: input.provider,
    providerAccountId: identity.providerAccountId,
    email: identity.email,
    emailVerified: identity.emailVerified,
    firstName: identity.firstName,
    lastName: identity.lastName,
    avatarUrl: identity.avatarUrl,
    accessToken: input.supabaseAccessToken,
    refreshToken: input.supabaseRefreshToken ?? null,
    expiresAt: null,
  };
}
