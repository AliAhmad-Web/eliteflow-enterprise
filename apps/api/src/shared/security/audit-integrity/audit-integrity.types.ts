import { createHash } from "node:crypto";

/** Current hash algorithm / payload layout version. */
export const AUDIT_HASH_VERSION = 1 as const;

/** Genesis previousHash for the first integrity-protected event. */
export const AUDIT_CHAIN_GENESIS = createHash("sha256")
  .update("ELITEFLOW_AUDIT_CHAIN_GENESIS_V1")
  .digest("hex");

export const AUDIT_CHAIN_BREAK_REASONS = {
  VALID: "valid",
  BROKEN_HASH: "broken_hash",
  MISSING_LINK: "missing_link",
  CORRUPTED_EVENT: "corrupted_event",
} as const;

export type AuditChainBreakReason =
  (typeof AUDIT_CHAIN_BREAK_REASONS)[keyof typeof AUDIT_CHAIN_BREAK_REASONS];

export type AuditVerificationStatus =
  | "valid"
  | "legacy"
  | "broken_hash"
  | "missing_link"
  | "corrupted_event";

export interface AuditIntegrityPayload {
  previousHash: string;
  timestamp: string;
  actor: string;
  action: string;
  entity: string;
  metadata: string;
}

export interface AuditChainBrokenRow {
  id: string;
  reason: Exclude<AuditChainBreakReason, "valid">;
  /** Opaque index in stream order (1-based). No hash values exposed. */
  rowNumber: number;
}

export interface AuditChainVerificationResult {
  chainValid: boolean;
  verifiedRows: number;
  hashedRows: number;
  legacyRows: number;
  brokenRow: AuditChainBrokenRow | null;
  verificationTimeMs: number;
  hashVersion: typeof AUDIT_HASH_VERSION;
}

export interface AuditExportIntegrityFields {
  hash: string | null;
  previousHash: string | null;
  chainVersion: number;
  verificationStatus: AuditVerificationStatus;
}

function sortKeysDeep(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  const record = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(record).sort()) {
    out[key] = sortKeysDeep(record[key]);
  }
  return out;
}

/** Canonical metadata string for hashing (stable key order). */
export function canonicalizeAuditMetadata(
  metadata: Record<string, unknown> | null | undefined,
): string {
  if (!metadata || Object.keys(metadata).length === 0) {
    return "";
  }
  return JSON.stringify(sortKeysDeep(metadata));
}

export function buildAuditEntity(
  resource: string,
  resourceId?: string | null,
): string {
  return `${resource}:${resourceId ?? ""}`;
}

/**
 * Hash =
 * SHA256(previousHash + timestamp + actor + action + entity + metadata)
 */
export function computeAuditEventHash(payload: AuditIntegrityPayload): string {
  const material = [
    payload.previousHash,
    payload.timestamp,
    payload.actor,
    payload.action,
    payload.entity,
    payload.metadata,
  ].join("");

  return createHash("sha256").update(material, "utf8").digest("hex");
}
