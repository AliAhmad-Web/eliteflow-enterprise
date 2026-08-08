import { PERMISSIONS } from "@enterprise/shared";

import { resolveEncryptionKeys } from "../../../config/encryption.config.js";
import {
  isApiSecurityMonitoringEnabled,
  isApiSecurityUploadHardeningEnabled,
  isApiZeroTrustEnabled,
  isApiZeroTrustEnforcementEnabled,
} from "../../../config/security-flags.js";
import { aiDataPolicyService } from "../../../modules/ai/foundation/policy/index.js";
import { isMfaMandatoryRole } from "../../../modules/auth/mfa/index.js";
import { auditIntegrityService } from "../audit-integrity/index.js";
import { recoveryPolicyService } from "../bcdr/index.js";
import { RETENTION_POLICIES } from "../data-retention/index.js";
import { securityMonitoringService } from "../monitoring/index.js";
import { sodPolicyService } from "../sod/index.js";
import { evidenceSourceLabel } from "./compliance.registry.js";
import type {
  ComplianceControlStatus,
  ComplianceEvidenceItem,
  ComplianceEvidenceSource,
  ComplianceRiskLevel,
} from "./compliance.types.js";
import { COMPLIANCE_EVIDENCE_SOURCES } from "./compliance.types.js";

export interface EvidenceProbeResult {
  present: boolean;
  /** Fully satisfied vs partially configured. */
  strength: "full" | "partial" | "missing" | "failed";
  detail: string;
}

function probeMfa(): EvidenceProbeResult {
  const adminRequired = isMfaMandatoryRole("ADMIN");
  const superRequired = isMfaMandatoryRole("SUPER_ADMIN");
  if (adminRequired && superRequired) {
    return {
      present: true,
      strength: "full",
      detail: "MFA mandatory for ADMIN and SUPER_ADMIN",
    };
  }
  return {
    present: false,
    strength: "partial",
    detail: "MFA mandatory role policy incomplete",
  };
}

function probeEncryption(): EvidenceProbeResult {
  try {
    const keys = resolveEncryptionKeys();
    if (keys.usedEphemeralDevKey) {
      return {
        present: true,
        strength: "partial",
        detail: "Encryption active with ephemeral development key",
      };
    }
    return {
      present: true,
      strength: "full",
      detail: "Enterprise encryption key resolved",
    };
  } catch (error) {
    return {
      present: false,
      strength: "failed",
      detail:
        error instanceof Error
          ? error.message
          : "Encryption configuration unavailable",
    };
  }
}

function probeAuditChain(): EvidenceProbeResult {
  if (typeof auditIntegrityService.verifyAuditChain === "function") {
    return {
      present: true,
      strength: "full",
      detail: "Audit integrity chain service available",
    };
  }
  return {
    present: false,
    strength: "failed",
    detail: "Audit integrity service missing verifyAuditChain",
  };
}

function probeZeroTrust(): EvidenceProbeResult {
  const enabled = isApiZeroTrustEnabled();
  const enforcement = isApiZeroTrustEnforcementEnabled();
  if (enabled && enforcement) {
    return {
      present: true,
      strength: "full",
      detail: "Zero Trust evaluation and enforcement enabled",
    };
  }
  if (enabled) {
    return {
      present: true,
      strength: "partial",
      detail: "Zero Trust evaluation on; enforcement disabled",
    };
  }
  return {
    present: false,
    strength: "missing",
    detail: "Zero Trust disabled via feature flag",
  };
}

function probeAiDataGuard(): EvidenceProbeResult {
  if (typeof aiDataPolicyService.assertAIAccess === "function") {
    return {
      present: true,
      strength: "full",
      detail: "AI data policy service loaded",
    };
  }
  return {
    present: false,
    strength: "failed",
    detail: "AI data policy service unavailable",
  };
}

function probeSecurityMonitoring(): EvidenceProbeResult {
  const flagOn = isApiSecurityMonitoringEnabled();
  const servicePresent =
    typeof securityMonitoringService.report === "function";

  if (flagOn && servicePresent) {
    return {
      present: true,
      strength: "full",
      detail: "Security monitoring enabled and service available",
    };
  }
  if (servicePresent) {
    return {
      present: true,
      strength: "partial",
      detail: "Monitoring service present; SECURITY_MONITORING flag off",
    };
  }
  return {
    present: false,
    strength: "missing",
    detail: "Security monitoring not available",
  };
}

function probeRetention(): EvidenceProbeResult {
  const count = RETENTION_POLICIES.length;
  if (count > 0) {
    return {
      present: true,
      strength: "full",
      detail: `${count} retention policies registered`,
    };
  }
  return {
    present: false,
    strength: "missing",
    detail: "No retention policies registered",
  };
}

function probeBcdr(): EvidenceProbeResult {
  try {
    const caps = recoveryPolicyService.getCapabilities();
    return {
      present: true,
      strength: "full",
      detail: `BCDR recovery mode=${caps.mode}`,
    };
  } catch (error) {
    return {
      present: false,
      strength: "failed",
      detail: error instanceof Error ? error.message : "BCDR probe failed",
    };
  }
}

function probeUploadSecurity(): EvidenceProbeResult {
  const hardening = isApiSecurityUploadHardeningEnabled();
  if (hardening) {
    return {
      present: true,
      strength: "full",
      detail: "Upload hardening enabled",
    };
  }
  return {
    present: false,
    strength: "failed",
    detail: "Upload hardening disabled",
  };
}

function probeRbac(): EvidenceProbeResult {
  const keys = Object.keys(PERMISSIONS);
  if (keys.length > 0) {
    return {
      present: true,
      strength: "full",
      detail: `${keys.length} permission keys in catalog`,
    };
  }
  return {
    present: false,
    strength: "failed",
    detail: "Permission catalog empty",
  };
}

function probeAcl(): EvidenceProbeResult {
  const keys = Object.keys(PERMISSIONS);
  if (keys.length > 10) {
    return {
      present: true,
      strength: "full",
      detail: "Field authorization and permission catalog available",
    };
  }
  return {
    present: false,
    strength: "partial",
    detail: "ACL primitives incomplete",
  };
}

function probeSod(): EvidenceProbeResult {
  if (typeof sodPolicyService.assertCanApprove === "function") {
    return {
      present: true,
      strength: "full",
      detail: "SoD policy service available",
    };
  }
  return {
    present: false,
    strength: "failed",
    detail: "SoD policy service unavailable",
  };
}

export function probeEvidenceSource(
  source: ComplianceEvidenceSource,
): EvidenceProbeResult {
  switch (source) {
    case "mfa":
      return probeMfa();
    case "encryption":
      return probeEncryption();
    case "audit_chain":
      return probeAuditChain();
    case "zero_trust":
      return probeZeroTrust();
    case "ai_data_guard":
      return probeAiDataGuard();
    case "security_monitoring":
      return probeSecurityMonitoring();
    case "retention":
      return probeRetention();
    case "bcdr":
      return probeBcdr();
    case "upload_security":
      return probeUploadSecurity();
    case "rbac":
      return probeRbac();
    case "acl":
      return probeAcl();
    case "sod":
      return probeSod();
    default: {
      const _exhaustive: never = source;
      return _exhaustive;
    }
  }
}

export function collectAllEvidence(): ComplianceEvidenceItem[] {
  const collectedAt = new Date().toISOString();
  return COMPLIANCE_EVIDENCE_SOURCES.map((source) => {
    const probe = probeEvidenceSource(source);
    return {
      source,
      label: evidenceSourceLabel(source),
      present: probe.present,
      detail: probe.detail,
      collectedAt,
    };
  });
}

export function statusFromEvidence(
  sources: ComplianceEvidenceSource[],
): { status: ComplianceControlStatus; riskBoost: boolean } {
  if (sources.length === 0) {
    return { status: "PLANNED", riskBoost: true };
  }

  const probes = sources.map((s) => probeEvidenceSource(s));
  if (probes.every((p) => p.strength === "full")) {
    return { status: "IMPLEMENTED", riskBoost: false };
  }
  if (probes.some((p) => p.strength === "failed")) {
    return { status: "FAILED", riskBoost: true };
  }
  if (probes.every((p) => p.strength === "missing")) {
    return { status: "PLANNED", riskBoost: true };
  }
  if (probes.some((p) => p.present)) {
    return { status: "PARTIAL", riskBoost: true };
  }
  return { status: "PLANNED", riskBoost: true };
}

export function residualRisk(
  inherent: ComplianceRiskLevel,
  status: ComplianceControlStatus,
): ComplianceRiskLevel {
  switch (status) {
    case "IMPLEMENTED":
    case "NOT_APPLICABLE":
      return "LOW";
    case "PARTIAL":
      return inherent === "CRITICAL"
        ? "HIGH"
        : inherent === "HIGH"
          ? "MEDIUM"
          : "LOW";
    case "PLANNED":
      return inherent;
    case "FAILED":
      return inherent === "LOW"
        ? "MEDIUM"
        : inherent === "MEDIUM"
          ? "HIGH"
          : "CRITICAL";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}
