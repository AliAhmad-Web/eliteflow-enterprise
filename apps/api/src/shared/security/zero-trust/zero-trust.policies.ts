import type { DataClassification } from "@enterprise/shared";

import type {
  ZeroTrustPolicyDto,
  ZeroTrustRiskLevel,
} from "./zero-trust.types.js";

/** Password age (days) above which trust is reduced. */
export const ZERO_TRUST_PASSWORD_MAX_AGE_DAYS = 90;

/** Step-up MFA validity window. */
export const ZERO_TRUST_STEP_UP_TTL_MS = 15 * 60 * 1000;

/**
 * Central Zero Trust action policy by risk level.
 * LOW → Allow | MEDIUM → Allow+audit | HIGH → Step-up | CRITICAL → Block
 */
export const ZERO_TRUST_RISK_POLICIES: readonly ZeroTrustPolicyDto[] = [
  {
    riskLevel: "LOW",
    action: "ALLOW",
    description: "Allow request without additional controls.",
  },
  {
    riskLevel: "MEDIUM",
    action: "ALLOW_AUDIT",
    description: "Allow request and emit a trust evaluation audit event.",
  },
  {
    riskLevel: "HIGH",
    action: "REQUIRE_STEP_UP",
    description:
      "Require step-up MFA when available; otherwise allow with elevated audit.",
  },
  {
    riskLevel: "CRITICAL",
    action: "BLOCK",
    description: "Block the request. Trust cannot be established.",
  },
] as const;

/** Path prefix → data classification (continuous resource trust). */
export const ZERO_TRUST_ROUTE_CLASSIFICATIONS: Array<{
  prefix: string;
  classification: DataClassification;
}> = [
  // Read-only status telemetry stays CONFIDENTIAL so Admin Ops can load
  // without MFA. Mutating retention/audit routes remain RESTRICTED below.
  { prefix: "/security/retention/status", classification: "CONFIDENTIAL" },
  { prefix: "/security/audit/verify", classification: "CONFIDENTIAL" },
  { prefix: "/security/audit/export", classification: "RESTRICTED" },
  { prefix: "/security/audit", classification: "RESTRICTED" },
  { prefix: "/security/retention", classification: "RESTRICTED" },
  { prefix: "/security/zero-trust", classification: "CONFIDENTIAL" },
  { prefix: "/security", classification: "CONFIDENTIAL" },
  { prefix: "/team", classification: "CONFIDENTIAL" },
  { prefix: "/settings", classification: "INTERNAL" },
  { prefix: "/ai", classification: "CONFIDENTIAL" },
  { prefix: "/reports", classification: "CONFIDENTIAL" },
  { prefix: "/files", classification: "INTERNAL" },
  { prefix: "/invoices", classification: "CONFIDENTIAL" },
  { prefix: "/integrations", classification: "CONFIDENTIAL" },
  { prefix: "/communication", classification: "INTERNAL" },
  { prefix: "/notifications", classification: "INTERNAL" },
  { prefix: "/projects", classification: "INTERNAL" },
  { prefix: "/tasks", classification: "INTERNAL" },
  { prefix: "/clients", classification: "INTERNAL" },
  { prefix: "/calendar", classification: "INTERNAL" },
  { prefix: "/auth/mfa", classification: "INTERNAL" },
  { prefix: "/auth", classification: "INTERNAL" },
];

export function resolvePathClassification(path: string): DataClassification {
  const normalized = path.split("?")[0] ?? path;
  for (const entry of ZERO_TRUST_ROUTE_CLASSIFICATIONS) {
    if (
      normalized === entry.prefix ||
      normalized.startsWith(`${entry.prefix}/`)
    ) {
      return entry.classification;
    }
  }
  return "INTERNAL";
}

export function riskRank(level: ZeroTrustRiskLevel): number {
  switch (level) {
    case "LOW":
      return 0;
    case "MEDIUM":
      return 1;
    case "HIGH":
      return 2;
    case "CRITICAL":
      return 3;
    default: {
      const _exhaustive: never = level;
      return _exhaustive;
    }
  }
}

export function maxRisk(
  a: ZeroTrustRiskLevel,
  b: ZeroTrustRiskLevel,
): ZeroTrustRiskLevel {
  return riskRank(a) >= riskRank(b) ? a : b;
}

export function scoreToRisk(score: number): ZeroTrustRiskLevel {
  if (score >= 80) return "CRITICAL";
  if (score >= 55) return "HIGH";
  if (score >= 30) return "MEDIUM";
  return "LOW";
}

/** Paths that must not re-challenge step-up (avoid loops). */
export const ZERO_TRUST_STEP_UP_EXEMPT_PATHS = [
  "/auth/mfa/step-up",
  "/auth/mfa/status",
  "/auth/mfa/setup",
  "/auth/mfa/enable",
  "/auth/mfa/disable",
  "/auth/logout",
  "/auth/refresh",
  "/security/zero-trust/status",
  "/security/zero-trust/policies",
] as const;
