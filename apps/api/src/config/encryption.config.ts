import { createHash, randomBytes } from "node:crypto";

import { authConfig } from "./auth.config.js";

const MIN_KEY_CHARS = 32;

export type EncryptionKeyId = "primary" | "previous";

export interface ResolvedEncryptionKeys {
  primary: Buffer;
  previous: Buffer | null;
  /** True when a process-local ephemeral key was generated (dev only). */
  usedEphemeralDevKey: boolean;
}

let cached: ResolvedEncryptionKeys | null = null;
let ephemeralDevKey: string | null = null;

function deriveKeyMaterial(raw: string): Buffer {
  const trimmed = raw.trim();
  try {
    const fromB64 = Buffer.from(trimmed, "base64");
    if (fromB64.length === 32) {
      return fromB64;
    }
  } catch {
    // fall through to sha256
  }
  return createHash("sha256").update(trimmed, "utf8").digest();
}

function readConfiguredKey(): string | null {
  const key = process.env.ENTERPRISE_ENCRYPTION_KEY?.trim();
  return key && key.length > 0 ? key : null;
}

function readPreviousKey(): string | null {
  const key = process.env.ENTERPRISE_ENCRYPTION_KEY_PREVIOUS?.trim();
  return key && key.length > 0 ? key : null;
}

/**
 * Resolve active encryption keys.
 * Production requires ENTERPRISE_ENCRYPTION_KEY.
 * Development may generate a temporary in-memory key (with warning).
 */
export function resolveEncryptionKeys(): ResolvedEncryptionKeys {
  if (cached) return cached;

  const configured = readConfiguredKey();
  let usedEphemeralDevKey = false;
  let primaryRaw: string;

  if (configured) {
    if (configured.length < MIN_KEY_CHARS) {
      throw new Error(
        `ENTERPRISE_ENCRYPTION_KEY must be at least ${MIN_KEY_CHARS} characters (or 32-byte base64).`,
      );
    }
    primaryRaw = configured;
  } else if (authConfig.isProduction) {
    throw new Error(
      "ENTERPRISE_ENCRYPTION_KEY must be set in production for encryption at rest.",
    );
  } else {
    if (!ephemeralDevKey) {
      ephemeralDevKey = randomBytes(32).toString("base64");
      console.warn(
        "[encryption] ENTERPRISE_ENCRYPTION_KEY is not set — using a temporary in-memory development key. Encrypted data will not survive restarts. Set ENTERPRISE_ENCRYPTION_KEY for stable local encryption.",
      );
    }
    primaryRaw = ephemeralDevKey;
    usedEphemeralDevKey = true;
  }

  const previousRaw = readPreviousKey();
  if (previousRaw && previousRaw.length < MIN_KEY_CHARS) {
    throw new Error(
      `ENTERPRISE_ENCRYPTION_KEY_PREVIOUS must be at least ${MIN_KEY_CHARS} characters (or 32-byte base64).`,
    );
  }

  cached = {
    primary: deriveKeyMaterial(primaryRaw),
    previous: previousRaw ? deriveKeyMaterial(previousRaw) : null,
    usedEphemeralDevKey,
  };
  return cached;
}

/** Fail fast in production when the enterprise encryption key is missing. */
export function assertEnterpriseEncryptionConfig(): void {
  cached = null;
  resolveEncryptionKeys();
}

/** Test helper — clears cached keys. */
export function resetEncryptionKeyCache(): void {
  cached = null;
  ephemeralDevKey = null;
}

export function getEncryptionKey(keyId: EncryptionKeyId = "primary"): Buffer {
  const keys = resolveEncryptionKeys();
  if (keyId === "previous") {
    if (!keys.previous) {
      throw new Error("ENTERPRISE_ENCRYPTION_KEY_PREVIOUS is not configured");
    }
    return keys.previous;
  }
  return keys.primary;
}
