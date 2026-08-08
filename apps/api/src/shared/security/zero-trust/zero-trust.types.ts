import type { DataClassification } from "@enterprise/shared";

export const ZERO_TRUST_RISK_LEVELS = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
] as const;

export type ZeroTrustRiskLevel = (typeof ZERO_TRUST_RISK_LEVELS)[number];

export const ZERO_TRUST_DECISIONS = [
  "ALLOW",
  "ALLOW_AUDIT",
  "REQUIRE_STEP_UP",
  "BLOCK",
] as const;

export type ZeroTrustDecision = (typeof ZERO_TRUST_DECISIONS)[number];

export interface ZeroTrustSignal {
  key: string;
  label: string;
  contribution: number;
  detail?: string;
}

export interface SessionTrustResult {
  trusted: boolean;
  riskLevel: ZeroTrustRiskLevel;
  score: number;
  signals: ZeroTrustSignal[];
  reasons: string[];
}

export interface ResourceTrustResult {
  classification: DataClassification;
  riskLevel: ZeroTrustRiskLevel;
  requiresElevatedTrust: boolean;
  signals: ZeroTrustSignal[];
}

export interface RequestTrustResult {
  riskLevel: ZeroTrustRiskLevel;
  decision: ZeroTrustDecision;
  score: number;
  requiresStepUp: boolean;
  reason: string;
  signals: ZeroTrustSignal[];
  session: SessionTrustResult;
  resource: ResourceTrustResult;
  evaluatedAt: string;
}

export interface ZeroTrustPolicyDto {
  riskLevel: ZeroTrustRiskLevel;
  action: ZeroTrustDecision;
  description: string;
}

export interface ZeroTrustStatusDto {
  enabled: boolean;
  enforcement: boolean;
  lastEvaluation: RequestTrustResult | null;
  stepUpActive: boolean;
  stepUpExpiresAt: string | null;
  policies: ZeroTrustPolicyDto[];
}

export const ZERO_TRUST_ERROR_CODES = {
  STEP_UP_REQUIRED: "TRUST_STEP_UP_REQUIRED",
  TRUST_DENIED: "TRUST_DENIED",
  CRITICAL_BLOCK: "TRUST_CRITICAL_BLOCK",
} as const;
