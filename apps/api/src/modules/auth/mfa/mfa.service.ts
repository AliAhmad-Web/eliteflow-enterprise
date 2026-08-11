import { randomBytes } from "node:crypto";

import * as argon2 from "argon2";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";

import { encryptionService } from "../../../shared/security/encryption.service.js";

const ISSUER = "EliteFlow";
const TOTP_DIGITS = 6;
const TOTP_PERIOD = 30;
const TOTP_WINDOW = 1;
const RECOVERY_CODE_COUNT = 10;
const PENDING_TTL_MS = 15 * 60 * 1000;

export interface RecoveryCodeRecord {
  hash: string;
  usedAt: string | null;
}

export interface MfaSetupResult {
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
  recoveryCodes: string[];
}

interface PendingEnrollment {
  encryptedSecret: string;
  recoveryCodes: RecoveryCodeRecord[];
  expiresAt: number;
}

const pendingByUserId = new Map<string, PendingEnrollment>();

function buildTotp(secretBase32: string, label: string): OTPAuth.TOTP {
  return new OTPAuth.TOTP({
    issuer: ISSUER,
    label,
    algorithm: "SHA1",
    digits: TOTP_DIGITS,
    period: TOTP_PERIOD,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  });
}

function normalizeRecoveryCode(code: string): string {
  return code.trim().toUpperCase().replace(/[\s-]/g, "");
}

function generateRecoveryCodePlain(): string {
  const hex = randomBytes(6).toString("hex").toUpperCase();
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`;
}

/**
 * Centralized Enterprise MFA (TOTP RFC 6238) service.
 * Secrets are encrypted at rest; recovery codes are stored hashed only.
 */
export class MfaService {
  generateSecret(): string {
    return new OTPAuth.Secret({ size: 20 }).base32;
  }

  async generateQRCode(email: string, secretBase32: string): Promise<string> {
    const totp = buildTotp(secretBase32, email);
    return QRCode.toDataURL(totp.toString());
  }

  getOtpauthUrl(email: string, secretBase32: string): string {
    return buildTotp(secretBase32, email).toString();
  }

  /**
   * Verify a TOTP code. Rejects replay when `lastStep` is provided.
   */
  verifyCode(
    secretBase32: string,
    code: string,
    lastStep?: number | null,
  ): { valid: boolean; step?: number } {
    const trimmed = code.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      return { valid: false };
    }

    const totp = buildTotp(secretBase32, "verify");
    const delta = totp.validate({ token: trimmed, window: TOTP_WINDOW });
    if (delta === null) {
      return { valid: false };
    }

    const currentStep = Math.floor(Date.now() / 1000 / TOTP_PERIOD);
    const step = currentStep + delta;

    if (lastStep != null && step <= lastStep) {
      return { valid: false };
    }

    return { valid: true, step };
  }

  generateRecoveryCodes(count = RECOVERY_CODE_COUNT): string[] {
    const codes = new Set<string>();
    while (codes.size < count) {
      codes.add(generateRecoveryCodePlain());
    }
    return [...codes];
  }

  async hashRecoveryCodes(codes: string[]): Promise<RecoveryCodeRecord[]> {
    const records: RecoveryCodeRecord[] = [];
    for (const code of codes) {
      const hash = await argon2.hash(normalizeRecoveryCode(code), {
        type: argon2.argon2id,
        memoryCost: 19_456,
        timeCost: 2,
        parallelism: 1,
      });
      records.push({ hash, usedAt: null });
    }
    return records;
  }

  async verifyRecoveryCode(
    stored: RecoveryCodeRecord[],
    code: string,
  ): Promise<{ valid: boolean; updated: RecoveryCodeRecord[] }> {
    const normalized = normalizeRecoveryCode(code);
    if (normalized.length < 8) {
      return { valid: false, updated: stored };
    }

    const updated = stored.map((entry) => ({ ...entry }));

    for (let i = 0; i < updated.length; i += 1) {
      const entry = updated[i];
      if (!entry || entry.usedAt) {
        continue;
      }

      const matches = await argon2.verify(entry.hash, normalized).catch(() => false);
      if (!matches) {
        continue;
      }

      updated[i] = { ...entry, usedAt: new Date().toISOString() };
      return { valid: true, updated };
    }

    return { valid: false, updated: stored };
  }

  encryptSecret(plaintextSecret: string): string {
    return encryptionService.encrypt(plaintextSecret);
  }

  decryptSecret(encryptedSecret: string): string {
    try {
      const decrypted = encryptionService.decryptIfNeeded(encryptedSecret);
      if (!decrypted) {
        throw new Error("MFA secret could not be decrypted");
      }
      return decrypted;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "MFA secret decrypt failed";
      // Wrong ENTERPRISE_ENCRYPTION_KEY / BOM corruption surfaces as GCM auth failure.
      throw new Error(
        message.includes("authenticate data") ||
          message.includes("Unsupported state")
          ? "MFA secret could not be decrypted with the current encryption key"
          : message,
      );
    }
  }

  parseRecoveryCodes(value: unknown): RecoveryCodeRecord[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((entry) => {
        if (!entry || typeof entry !== "object") {
          return null;
        }
        const record = entry as { hash?: unknown; usedAt?: unknown };
        if (typeof record.hash !== "string") {
          return null;
        }
        return {
          hash: record.hash,
          usedAt:
            record.usedAt === null || record.usedAt === undefined
              ? null
              : String(record.usedAt),
        } satisfies RecoveryCodeRecord;
      })
      .filter((entry): entry is RecoveryCodeRecord => entry !== null);
  }

  /**
   * Begin enrollment: returns plaintext secret + QR + recovery codes once.
   * Persists nothing until enableMFA succeeds.
   */
  async beginSetup(userId: string, email: string): Promise<MfaSetupResult> {
    this.clearPending(userId);

    const secret = this.generateSecret();
    const recoveryCodes = this.generateRecoveryCodes();
    const recoveryHashes = await this.hashRecoveryCodes(recoveryCodes);
    const qrCodeDataUrl = await this.generateQRCode(email, secret);
    const otpauthUrl = this.getOtpauthUrl(email, secret);

    pendingByUserId.set(userId, {
      encryptedSecret: this.encryptSecret(secret),
      recoveryCodes: recoveryHashes,
      expiresAt: Date.now() + PENDING_TTL_MS,
    });

    return {
      secret,
      otpauthUrl,
      qrCodeDataUrl,
      recoveryCodes,
    };
  }

  consumePending(userId: string): PendingEnrollment | null {
    const pending = pendingByUserId.get(userId);
    if (!pending) {
      return null;
    }
    if (pending.expiresAt < Date.now()) {
      pendingByUserId.delete(userId);
      return null;
    }
    return pending;
  }

  clearPending(userId: string): void {
    pendingByUserId.delete(userId);
  }

  /**
   * Verify setup code against pending enrollment and return material to persist.
   */
  async enableMFA(
    userId: string,
    code: string,
  ): Promise<{
    encryptedSecret: string;
    recoveryCodes: RecoveryCodeRecord[];
  }> {
    const pending = this.consumePending(userId);
    if (!pending) {
      throw new Error("MFA_SETUP_EXPIRED");
    }

    const secret = this.decryptSecret(pending.encryptedSecret);
    const verified = this.verifyCode(secret, code);
    if (!verified.valid) {
      throw new Error("MFA_CODE_INVALID");
    }

    this.clearPending(userId);

    return {
      encryptedSecret: pending.encryptedSecret,
      recoveryCodes: pending.recoveryCodes,
    };
  }

  /**
   * Clear MFA material for persistence (caller writes DB + audits).
   */
  disableMFA(userId: string): {
    twoFactorEnabled: false;
    twoFactorSecret: null;
    recoveryCodes: null;
    twoFactorLastStep: null;
  } {
    this.clearPending(userId);
    return {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      recoveryCodes: null,
      twoFactorLastStep: null,
    };
  }

  /**
   * Verify a login MFA challenge (TOTP or unused recovery code).
   */
  async verifyLoginFactor(input: {
    encryptedSecret: string;
    recoveryCodes: RecoveryCodeRecord[];
    lastStep: number | null;
    code: string;
  }): Promise<
    | { ok: true; method: "totp"; step: number }
    | { ok: true; method: "recovery"; updatedRecoveryCodes: RecoveryCodeRecord[] }
    | { ok: false }
  > {
    let secret: string | null = null;
    try {
      secret = this.decryptSecret(input.encryptedSecret);
    } catch (error) {
      console.error("[mfa] TOTP secret decrypt failed:", error);
      // Still allow recovery-code login when ciphertext cannot be opened
      // (e.g. encryption-key mismatch after host migration).
    }

    if (secret) {
      const totp = this.verifyCode(secret, input.code, input.lastStep);
      if (totp.valid && totp.step != null) {
        return { ok: true, method: "totp", step: totp.step };
      }
    }

    const recovery = await this.verifyRecoveryCode(
      input.recoveryCodes,
      input.code,
    );
    if (recovery.valid) {
      return {
        ok: true,
        method: "recovery",
        updatedRecoveryCodes: recovery.updated,
      };
    }

    return { ok: false };
  }

  /**
   * Verify code before disabling MFA (TOTP or recovery).
   */
  async verifyForDisable(input: {
    encryptedSecret: string;
    recoveryCodes: RecoveryCodeRecord[];
    lastStep: number | null;
    code: string;
  }): Promise<
    | { ok: true; method: "totp" | "recovery"; step?: number; updatedRecoveryCodes?: RecoveryCodeRecord[] }
    | { ok: false }
  > {
    const result = await this.verifyLoginFactor(input);
    if (!result.ok) {
      return { ok: false };
    }
    if (result.method === "totp") {
      return { ok: true, method: "totp", step: result.step };
    }
    return {
      ok: true,
      method: "recovery",
      updatedRecoveryCodes: result.updatedRecoveryCodes,
    };
  }
}

export const mfaService = new MfaService();

/** Roles that must enroll MFA (hard server-side gate for privileged APIs). */
export function isMfaMandatoryRole(roleCode: string): boolean {
  const normalized = String(roleCode ?? "")
    .trim()
    .toUpperCase();
  // CLIENT / EMPLOYEE / HR / MANAGER are never MFA-mandatory.
  return normalized === "SUPER_ADMIN" || normalized === "ADMIN";
}

/** Roles allowed to optionally enroll MFA (clients excluded). */
export function isMfaOptionalRole(roleCode: string): boolean {
  return (
    roleCode === "EMPLOYEE" ||
    roleCode === "HR" ||
    roleCode === "MANAGER" ||
    isMfaMandatoryRole(roleCode)
  );
}
