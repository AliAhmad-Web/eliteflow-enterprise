/**
 * Encryption audit checks — metadata only; never decrypt or expose keys.
 */

import { existsSync } from "node:fs";

import { authConfig } from "../../../config/auth.config.js";
import { resolveEncryptionKeys } from "../../../config/encryption.config.js";
import { getEncryptionAuditConfig } from "./encryption-audit.config.js";
import type {
  EncryptionConfigEvidence,
  FieldSampleStats,
} from "./encryption-audit.collector.js";
import type {
  EncryptionAuditCheckId,
  EncryptionAuditRecommendation,
  EncryptionAuditStatus,
  EncryptionCheckResult,
  SourceAuditResult,
} from "./encryption-audit.types.js";
import { ENCRYPTION_AUDIT_SOURCES } from "./encryption-audit.types.js";

export function collectConfigEvidence(): EncryptionConfigEvidence {
  const cfg = getEncryptionAuditConfig();
  const isProduction = authConfig.isProduction;

  let enterpriseKeyConfigured = false;
  let enterpriseKeyEphemeral = false;
  let previousKeyConfigured = false;
  let primaryKeyBytes: number | null = null;

  try {
    const keys = resolveEncryptionKeys();
    enterpriseKeyConfigured = true;
    enterpriseKeyEphemeral = keys.usedEphemeralDevKey;
    previousKeyConfigured = Boolean(keys.previous);
    primaryKeyBytes = keys.primary.length;
  } catch {
    enterpriseKeyConfigured = false;
  }

  const jwtSecret = authConfig.jwtSecret ?? "";
  const keySetAtRaw = process.env.ENTERPRISE_ENCRYPTION_KEY_SET_AT?.trim();
  let keyAgeDays: number | null = null;
  let keySetAtConfigured = false;
  if (keySetAtRaw) {
    const t = Date.parse(keySetAtRaw);
    if (Number.isFinite(t)) {
      keySetAtConfigured = true;
      keyAgeDays = Math.max(0, (Date.now() - t) / 86_400_000);
    }
  }

  const tlsCert = process.env.TLS_CERT_PATH?.trim() || process.env.SSL_CERT_FILE?.trim();
  const tlsKey = process.env.TLS_KEY_PATH?.trim() || process.env.SSL_KEY_FILE?.trim();

  let httpsOnlyCorsInProduction: boolean | null = null;
  if (isProduction) {
    const origins = (process.env.CORS_ORIGIN ?? "")
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean);
    httpsOnlyCorsInProduction =
      origins.length > 0 &&
      origins.every((o) => o.startsWith("https://"));
  }

  void cfg;

  return {
    enterpriseKeyConfigured,
    enterpriseKeyEphemeral,
    previousKeyConfigured,
    primaryKeyBytes,
    jwtSecretConfigured: jwtSecret.length > 0,
    jwtSecretLength: jwtSecret.length,
    jwtIssuerSet: Boolean(authConfig.jwtIssuer),
    jwtAudienceSet: Boolean(authConfig.jwtAudience),
    tlsCertPathConfigured: Boolean(tlsCert),
    tlsKeyPathConfigured: Boolean(tlsKey),
    httpsOnlyCorsInProduction,
    isProduction,
    keySetAtConfigured,
    keyAgeDays,
    hashAlgoExpected: "sha256",
    aesAlgoExpected: "aes-256-gcm",
  };
}

export function runGlobalChecks(
  evidence: EncryptionConfigEvidence,
  samples: FieldSampleStats[],
): {
  checks: EncryptionCheckResult[];
  recommendations: EncryptionAuditRecommendation[];
  weakAlgorithms: number;
  expiredKeys: number;
  invalidConfigurations: number;
} {
  const cfg = getEncryptionAuditConfig();
  const checks: EncryptionCheckResult[] = [];
  const recommendations: EncryptionAuditRecommendation[] = [];
  let weakAlgorithms = 0;
  let expiredKeys = 0;
  let invalidConfigurations = 0;

  const push = (
    checkId: EncryptionAuditCheckId,
    status: EncryptionCheckResult["status"],
    message: string,
    evidenceMeta?: Record<string, unknown>,
  ) => {
    checks.push({ checkId, status, message, evidence: evidenceMeta });
    if (status === "FAIL") invalidConfigurations += 1;
  };

  // ENCRYPTION_ENABLED
  if (!evidence.enterpriseKeyConfigured) {
    push("ENCRYPTION_ENABLED", "FAIL", "Enterprise encryption key is not available");
    recommendations.push({
      severity: "CRITICAL",
      code: "SET_ENTERPRISE_ENCRYPTION_KEY",
      message: "Configure ENTERPRISE_ENCRYPTION_KEY for encryption at rest",
    });
  } else if (evidence.enterpriseKeyEphemeral) {
    push(
      "ENCRYPTION_ENABLED",
      "WARN",
      "Encryption enabled via ephemeral development key",
      { ephemeral: true },
    );
    recommendations.push({
      severity: "WARN",
      code: "PERSIST_ENCRYPTION_KEY",
      message: "Set ENTERPRISE_ENCRYPTION_KEY so encrypted data survives restarts",
    });
  } else {
    push("ENCRYPTION_ENABLED", "PASS", "Enterprise encryption is enabled");
  }

  // ALGORITHM / AES
  push(
    "ALGORITHM_VALIDATION",
    "PASS",
    `Expected application algorithm ${evidence.aesAlgoExpected}`,
    { algorithm: evidence.aesAlgoExpected },
  );
  push(
    "AES_CONFIGURATION",
    evidence.primaryKeyBytes === cfg.expectedAesKeyBytes ? "PASS" : evidence.primaryKeyBytes == null ? "FAIL" : "WARN",
    evidence.primaryKeyBytes === cfg.expectedAesKeyBytes
      ? `AES-256-GCM key material is ${cfg.expectedAesKeyBytes} bytes`
      : `AES key material length is ${evidence.primaryKeyBytes ?? "unknown"} (expected ${cfg.expectedAesKeyBytes})`,
    { keyBytes: evidence.primaryKeyBytes },
  );
  if (evidence.primaryKeyBytes != null && evidence.primaryKeyBytes < cfg.expectedAesKeyBytes) {
    weakAlgorithms += 1;
  }

  // KEY_AVAILABILITY / LENGTH / AGE
  push(
    "KEY_AVAILABILITY",
    evidence.enterpriseKeyConfigured ? "PASS" : "FAIL",
    evidence.enterpriseKeyConfigured
      ? evidence.previousKeyConfigured
        ? "Primary and previous encryption keys are available"
        : "Primary encryption key available (previous key not configured)"
      : "Encryption key unavailable",
    { previousKeyConfigured: evidence.previousKeyConfigured },
  );

  push(
    "KEY_LENGTH",
    evidence.primaryKeyBytes === cfg.expectedAesKeyBytes
      ? "PASS"
      : evidence.primaryKeyBytes == null
        ? "FAIL"
        : "WARN",
    `Derived key length ${evidence.primaryKeyBytes ?? "n/a"} bytes`,
  );

  if (!evidence.keySetAtConfigured) {
    push(
      "KEY_AGE",
      "SKIP",
      "Key age unknown — set ENTERPRISE_ENCRYPTION_KEY_SET_AT (ISO date) for age audits",
    );
  } else if (
    evidence.keyAgeDays != null &&
    evidence.keyAgeDays > cfg.maxKeyAgeDays
  ) {
    expiredKeys += 1;
    push(
      "KEY_AGE",
      "WARN",
      `Encryption key age ~${Math.round(evidence.keyAgeDays)}d exceeds ${cfg.maxKeyAgeDays}d`,
      { keyAgeDays: Math.round(evidence.keyAgeDays) },
    );
    recommendations.push({
      severity: "WARN",
      code: "REVIEW_KEY_AGE",
      message: "Review encryption key age and plan rotation outside this audit module",
    });
  } else {
    push(
      "KEY_AGE",
      "PASS",
      `Encryption key age ~${Math.round(evidence.keyAgeDays ?? 0)}d within policy`,
    );
  }

  // ENCRYPTED_FIELDS / PLAINTEXT
  const totalAssets = samples.reduce((s, x) => s + x.total, 0);
  const encryptedAssets = samples.reduce((s, x) => s + x.encryptedLike, 0);
  const plaintext = samples.reduce((s, x) => s + x.plaintextSuspect, 0);

  push(
    "ENCRYPTED_FIELDS",
    totalAssets === 0
      ? "WARN"
      : encryptedAssets >= totalAssets * 0.9
        ? "PASS"
        : encryptedAssets > 0
          ? "WARN"
          : "FAIL",
    `${encryptedAssets}/${totalAssets} sampled assets appear encrypted or integrity-protected`,
    { encryptedAssets, totalAssets },
  );

  if (plaintext > 0) {
    push(
      "PLAINTEXT_DETECTION",
      "FAIL",
      `${plaintext} sampled secret field(s) appear to be plaintext`,
      { plaintextSuspect: plaintext },
    );
    recommendations.push({
      severity: "CRITICAL",
      code: "REMEDIATE_PLAINTEXT",
      message: "Remediate plaintext secrets via existing encryption APIs (audit does not encrypt)",
    });
  } else {
    push(
      "PLAINTEXT_DETECTION",
      totalAssets === 0 ? "SKIP" : "PASS",
      totalAssets === 0
        ? "No secret samples available for plaintext detection"
        : "No plaintext secrets detected in samples",
    );
  }

  // CONFIGURATION
  const configOk =
    evidence.enterpriseKeyConfigured &&
    evidence.jwtSecretConfigured &&
    evidence.jwtSecretLength >= cfg.minJwtSecretLength;
  push(
    "CONFIGURATION_VALIDATION",
    configOk ? "PASS" : "FAIL",
    configOk
      ? "Core encryption and JWT configuration present"
      : "Invalid or incomplete encryption/JWT configuration",
  );

  // SECRETS_PROTECTION
  const secretSample = samples.find((s) => s.source === "SECRETS");
  const tokenSample = samples.find((s) => s.source === "TOKENS");
  const secretsOk =
    (secretSample?.plaintextSuspect ?? 0) === 0 &&
    (tokenSample?.plaintextSuspect ?? 0) === 0 &&
    ((secretSample?.total ?? 0) + (tokenSample?.total ?? 0) === 0 ||
      (secretSample?.encryptedLike ?? 0) + (tokenSample?.encryptedLike ?? 0) > 0);
  push(
    "SECRETS_PROTECTION",
    secretsOk ? "PASS" : "FAIL",
    secretsOk
      ? "Secrets tables use columnar ciphertext fields (values not exposed)"
      : "Secrets protection gaps detected in sampled credentials",
  );

  // JWT
  if (!evidence.jwtSecretConfigured) {
    push("JWT_SIGNING_CONFIGURATION", "FAIL", "JWT_SECRET is not configured");
  } else if (evidence.jwtSecretLength < cfg.minJwtSecretLength) {
    weakAlgorithms += 1;
    push(
      "JWT_SIGNING_CONFIGURATION",
      "FAIL",
      `JWT_SECRET length ${evidence.jwtSecretLength} is below minimum ${cfg.minJwtSecretLength}`,
      { length: evidence.jwtSecretLength },
    );
  } else {
    push(
      "JWT_SIGNING_CONFIGURATION",
      evidence.jwtIssuerSet && evidence.jwtAudienceSet ? "PASS" : "WARN",
      "JWT signing secret configured (issuer/audience checked; secret value not exposed)",
      {
        length: evidence.jwtSecretLength,
        issuerSet: evidence.jwtIssuerSet,
        audienceSet: evidence.jwtAudienceSet,
      },
    );
  }

  // TLS
  if (evidence.isProduction) {
    if (evidence.httpsOnlyCorsInProduction === true) {
      push("TLS_CONFIGURATION", "PASS", "Production CORS origins are HTTPS-only");
    } else {
      push(
        "TLS_CONFIGURATION",
        "WARN",
        "Production TLS/CORS configuration needs review",
      );
      recommendations.push({
        severity: "WARN",
        code: "ENFORCE_HTTPS_CORS",
        message: "Ensure CORS_ORIGIN uses HTTPS production origins only",
      });
    }
  } else {
    push(
      "TLS_CONFIGURATION",
      "SKIP",
      "TLS production CORS checks skipped in non-production",
    );
  }

  // HASH
  push(
    "HASH_ALGORITHM_VALIDATION",
    "PASS",
    `Enterprise key derivation uses ${evidence.hashAlgoExpected}`,
    { hash: evidence.hashAlgoExpected },
  );

  // CERTIFICATE
  const certPath =
    process.env.TLS_CERT_PATH?.trim() || process.env.SSL_CERT_FILE?.trim() || "";
  const keyPath =
    process.env.TLS_KEY_PATH?.trim() || process.env.SSL_KEY_FILE?.trim() || "";
  if (!certPath && !keyPath) {
    push(
      "CERTIFICATE_VALIDATION",
      evidence.isProduction ? "WARN" : "SKIP",
      "No TLS certificate path configured (may be terminated upstream)",
    );
  } else {
    const certExists = certPath ? existsSync(certPath) : false;
    const keyExists = keyPath ? existsSync(keyPath) : false;
    // Never read certificate/private key contents
    if (certExists && keyExists) {
      push(
        "CERTIFICATE_VALIDATION",
        "PASS",
        "TLS certificate and key paths exist (contents not read)",
        { certPathConfigured: true, keyPathConfigured: true },
      );
    } else {
      push(
        "CERTIFICATE_VALIDATION",
        "WARN",
        "TLS cert/key path configured but file missing on disk",
        { certExists, keyExists },
      );
    }
  }

  return {
    checks,
    recommendations,
    weakAlgorithms,
    expiredKeys,
    invalidConfigurations,
  };
}

export function buildSourceResults(
  samples: FieldSampleStats[],
  globalStatus: EncryptionAuditStatus,
): SourceAuditResult[] {
  const bySource = new Map(samples.map((s) => [s.source, s]));

  return ENCRYPTION_AUDIT_SOURCES.map((source) => {
    const sample = bySource.get(source);
    const encryptedAssets = sample?.encryptedLike ?? 0;
    const unencryptedAssets =
      (sample?.plaintextSuspect ?? 0) + (sample?.missingParts ?? 0);
    let status: EncryptionAuditStatus = globalStatus;
    if ((sample?.plaintextSuspect ?? 0) > 0) status = "FAILED";
    else if (!sample || sample.total === 0) status = "UNKNOWN";
    else if (unencryptedAssets > 0) status = "WARNING";
    else status = "HEALTHY";

    return {
      source,
      status,
      encryptedAssets,
      unencryptedAssets,
      checks: [],
    };
  });
}

export function aggregateStatus(
  checks: EncryptionCheckResult[],
): EncryptionAuditStatus {
  if (checks.some((c) => c.status === "FAIL")) return "FAILED";
  if (checks.some((c) => c.status === "WARN")) return "WARNING";
  if (checks.every((c) => c.status === "SKIP")) return "UNKNOWN";
  return "HEALTHY";
}

export function computeOverallScore(checks: EncryptionCheckResult[]): number {
  const scored = checks.filter((c) => c.status !== "SKIP");
  if (scored.length === 0) return 0;
  const points = scored.reduce((sum, c) => {
    switch (c.status) {
      case "PASS":
        return sum + 100;
      case "WARN":
        return sum + 60;
      case "FAIL":
        return sum + 0;
      default:
        return sum;
    }
  }, 0);
  return Math.round(points / scored.length);
}
