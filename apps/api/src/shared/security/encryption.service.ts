import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

import {
  getEncryptionKey,
  resolveEncryptionKeys,
  type EncryptionKeyId,
} from "../../config/encryption.config.js";

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12;
const VERSION = "v1";
const PREFIX = "efenc";

export interface EncryptionParts {
  ciphertext: string;
  iv: string;
  authTag: string;
  keyId: EncryptionKeyId;
  version: typeof VERSION;
}

/**
 * Enterprise Encryption Service — sole application-level crypto API.
 * AES-256-GCM with random IV, auth tag, versioned payload, key rotation.
 */
class EncryptionService {
  /** Versioned single-column ciphertext: efenc:v1:primary:<iv>:<tag>:<ct> */
  encrypt(plaintext: string, keyId: EncryptionKeyId = "primary"): string {
    const parts = this.encryptToParts(plaintext, keyId);
    return [
      PREFIX,
      parts.version,
      parts.keyId,
      parts.iv,
      parts.authTag,
      parts.ciphertext,
    ].join(":");
  }

  decrypt(payload: string): string {
    if (!this.isEncrypted(payload)) {
      throw new Error("Value is not an enterprise-encrypted payload");
    }
    const parts = this.parsePayload(payload);
    return this.decryptFromParts(parts);
  }

  isEncrypted(value: string | null | undefined): boolean {
    if (!value || typeof value !== "string") return false;
    return value.startsWith(`${PREFIX}:`);
  }

  /**
   * Encrypt plaintext for storage. Leaves null/undefined unchanged.
   * Already-encrypted values are returned as-is (idempotent).
   */
  encryptIfNeeded(
    value: string | null | undefined,
  ): string | null | undefined {
    if (value === null || value === undefined) return value;
    if (value === "") return value;
    if (this.isEncrypted(value)) return value;
    return this.encrypt(value);
  }

  /**
   * Decrypt storage value. Leaves plaintext legacy rows unchanged.
   */
  decryptIfNeeded(
    value: string | null | undefined,
  ): string | null | undefined {
    if (value === null || value === undefined) return value;
    if (value === "") return value;
    if (!this.isEncrypted(value)) return value;
    return this.decrypt(value);
  }

  /** Columnar encrypt for IntegrationCredential / webhook secret tables. */
  encryptToParts(
    plaintext: string,
    keyId: EncryptionKeyId = "primary",
  ): EncryptionParts {
    resolveEncryptionKeys();
    const key = getEncryptionKey(keyId);
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGO, key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return {
      ciphertext: encrypted.toString("base64"),
      iv: iv.toString("base64"),
      authTag: authTag.toString("base64"),
      keyId,
      version: VERSION,
    };
  }

  decryptFromParts(input: {
    ciphertext: string;
    iv: string;
    authTag: string;
    keyId?: EncryptionKeyId | string;
  }): string {
    resolveEncryptionKeys();
    const preferred =
      input.keyId === "previous" ? ("previous" as const) : ("primary" as const);
    const keys = resolveEncryptionKeys();
    const tryOrder: EncryptionKeyId[] =
      preferred === "previous" && keys.previous
        ? ["previous", "primary"]
        : keys.previous
          ? ["primary", "previous"]
          : ["primary"];

    let lastError: unknown;
    for (const keyId of tryOrder) {
      try {
        return this.decryptWithKey(input, getEncryptionKey(keyId));
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new Error("Failed to decrypt enterprise ciphertext");
  }

  private decryptWithKey(
    input: { ciphertext: string; iv: string; authTag: string },
    key: Buffer,
  ): string {
    const decipher = createDecipheriv(
      ALGO,
      key,
      Buffer.from(input.iv, "base64"),
    );
    decipher.setAuthTag(Buffer.from(input.authTag, "base64"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(input.ciphertext, "base64")),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  }

  private parsePayload(payload: string): EncryptionParts {
    const segments = payload.split(":");
    if (segments.length !== 6) {
      throw new Error("Invalid enterprise encryption payload format");
    }
    const [prefix, version, keyId, iv, authTag, ciphertext] = segments;
    if (prefix !== PREFIX || version !== VERSION) {
      throw new Error(`Unsupported encryption payload version: ${version}`);
    }
    if (keyId !== "primary" && keyId !== "previous") {
      throw new Error(`Unknown encryption key id: ${keyId}`);
    }
    if (!iv || !authTag || !ciphertext) {
      throw new Error("Incomplete enterprise encryption payload");
    }
    return {
      version: VERSION,
      keyId,
      iv,
      authTag,
      ciphertext,
    };
  }
}

export const encryptionService = new EncryptionService();

/** Constant-time compare for encrypted payloads (optional helpers). */
export function safeEqualString(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
