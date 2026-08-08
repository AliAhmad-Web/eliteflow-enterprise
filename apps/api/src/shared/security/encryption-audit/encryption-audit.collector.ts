/**
 * Collect sanitized encryption evidence — never returns secret values.
 */

import { prisma } from "@enterprise/database";

import { encryptionService } from "../encryption.service.js";
import { logger } from "../logger.js";
import { getEncryptionAuditConfig } from "./encryption-audit.config.js";
import type { EncryptionAuditSource } from "./encryption-audit.types.js";

export interface FieldSampleStats {
  source: EncryptionAuditSource;
  total: number;
  encryptedLike: number;
  plaintextSuspect: number;
  missingParts: number;
}

function looksBase64(value: string): boolean {
  if (value.length < 16) return false;
  return /^[A-Za-z0-9+/=]+$/.test(value.replace(/\s/g, ""));
}

function isPlaintextSuspect(value: string): boolean {
  if (!value) return false;
  if (encryptionService.isEncrypted(value)) return false;
  // Columnar ciphertext is base64; obvious plaintext heuristics
  if (value.includes(" ") || value.includes("@") || value.startsWith("sk-")) {
    return true;
  }
  if (value.length < 24) return true;
  return !looksBase64(value);
}

async function sampleCredentialTable(
  source: EncryptionAuditSource,
  rows: Array<{
    encryptedSecret: string;
    iv: string;
    authTag: string;
  }>,
): Promise<FieldSampleStats> {
  let encryptedLike = 0;
  let plaintextSuspect = 0;
  let missingParts = 0;

  for (const row of rows) {
    if (!row.iv || !row.authTag || !row.encryptedSecret) {
      missingParts += 1;
      continue;
    }
    if (encryptionService.isEncrypted(row.encryptedSecret)) {
      encryptedLike += 1;
    } else if (isPlaintextSuspect(row.encryptedSecret)) {
      plaintextSuspect += 1;
    } else if (looksBase64(row.encryptedSecret) && looksBase64(row.iv) && looksBase64(row.authTag)) {
      encryptedLike += 1;
    } else {
      plaintextSuspect += 1;
    }
  }

  return {
    source,
    total: rows.length,
    encryptedLike,
    plaintextSuspect,
    missingParts,
  };
}

export async function collectFieldSamples(): Promise<FieldSampleStats[]> {
  const take = getEncryptionAuditConfig().sampleSize;
  const results: FieldSampleStats[] = [];

  try {
    const secrets = await prisma.integrationCredential.findMany({
      where: { deletedAt: null },
      take,
      select: { encryptedSecret: true, iv: true, authTag: true },
    });
    results.push(await sampleCredentialTable("SECRETS", secrets));
  } catch (error) {
    logger.error("[encryption-audit] Failed sampling IntegrationCredential:", error);
    results.push({
      source: "SECRETS",
      total: 0,
      encryptedLike: 0,
      plaintextSuspect: 0,
      missingParts: 0,
    });
  }

  try {
    const creds = await prisma.credential.findMany({
      where: { deletedAt: null },
      take,
      select: { encryptedSecret: true, iv: true, authTag: true },
    });
    results.push(await sampleCredentialTable("TOKENS", creds));
  } catch (error) {
    logger.error("[encryption-audit] Failed sampling Credential:", error);
    results.push({
      source: "TOKENS",
      total: 0,
      encryptedLike: 0,
      plaintextSuspect: 0,
      missingParts: 0,
    });
  }

  try {
    const mfaUsers = await prisma.user.findMany({
      where: { twoFactorSecret: { not: null } },
      take,
      select: { twoFactorSecret: true },
    });
    let encryptedLike = 0;
    let plaintextSuspect = 0;
    for (const u of mfaUsers) {
      const secret = u.twoFactorSecret ?? "";
      if (encryptionService.isEncrypted(secret)) encryptedLike += 1;
      else if (secret) plaintextSuspect += 1;
    }
    results.push({
      source: "DATABASE",
      total: mfaUsers.length,
      encryptedLike,
      plaintextSuspect,
      missingParts: 0,
    });
  } catch (error) {
    logger.error("[encryption-audit] Failed sampling MFA secrets:", error);
    results.push({
      source: "DATABASE",
      total: 0,
      encryptedLike: 0,
      plaintextSuspect: 0,
      missingParts: 0,
    });
  }

  try {
    const fileCount = await prisma.managedFile.count({
      where: { deletedAt: null },
    });
    const withChecksum = await prisma.managedFile.count({
      where: { deletedAt: null, checksum: { not: null } },
    });
    results.push({
      source: "FILES",
      total: fileCount,
      encryptedLike: withChecksum,
      plaintextSuspect: 0,
      missingParts: Math.max(0, fileCount - withChecksum),
    });
  } catch {
    results.push({
      source: "FILES",
      total: 0,
      encryptedLike: 0,
      plaintextSuspect: 0,
      missingParts: 0,
    });
  }

  try {
    const memCount = await prisma.aiMemoryRecord.count({
      where: { deletedAt: null },
    });
    results.push({
      source: "AI_MEMORY",
      total: memCount,
      encryptedLike: 0,
      plaintextSuspect: 0,
      missingParts: 0,
    });
  } catch {
    results.push({
      source: "AI_MEMORY",
      total: 0,
      encryptedLike: 0,
      plaintextSuspect: 0,
      missingParts: 0,
    });
  }

  try {
    const docCount = await prisma.aiDocument.count({
      where: { deletedAt: null },
    });
    results.push({
      source: "DOCUMENTS",
      total: docCount,
      encryptedLike: 0,
      plaintextSuspect: 0,
      missingParts: 0,
    });
  } catch {
    results.push({
      source: "DOCUMENTS",
      total: 0,
      encryptedLike: 0,
      plaintextSuspect: 0,
      missingParts: 0,
    });
  }

  try {
    const backupCount = await prisma.backupRecord.count();
    const withChecksum = await prisma.backupRecord.count({
      where: { checksum: { not: null } },
    });
    results.push({
      source: "BACKUPS",
      total: backupCount,
      encryptedLike: withChecksum,
      plaintextSuspect: 0,
      missingParts: Math.max(0, backupCount - withChecksum),
    });
  } catch {
    results.push({
      source: "BACKUPS",
      total: 0,
      encryptedLike: 0,
      plaintextSuspect: 0,
      missingParts: 0,
    });
  }

  try {
    const sessionCount = await prisma.session.count({
      where: { revokedAt: null },
    });
    results.push({
      source: "SESSIONS",
      total: sessionCount,
      encryptedLike: sessionCount,
      plaintextSuspect: 0,
      missingParts: 0,
    });
  } catch {
    results.push({
      source: "SESSIONS",
      total: 0,
      encryptedLike: 0,
      plaintextSuspect: 0,
      missingParts: 0,
    });
  }

  return results;
}

/** Sanitized config snapshot — lengths/flags only, never secret values. */
export interface EncryptionConfigEvidence {
  enterpriseKeyConfigured: boolean;
  enterpriseKeyEphemeral: boolean;
  previousKeyConfigured: boolean;
  primaryKeyBytes: number | null;
  jwtSecretConfigured: boolean;
  jwtSecretLength: number;
  jwtIssuerSet: boolean;
  jwtAudienceSet: boolean;
  tlsCertPathConfigured: boolean;
  tlsKeyPathConfigured: boolean;
  httpsOnlyCorsInProduction: boolean | null;
  isProduction: boolean;
  keySetAtConfigured: boolean;
  keyAgeDays: number | null;
  hashAlgoExpected: "sha256";
  aesAlgoExpected: "aes-256-gcm";
}
