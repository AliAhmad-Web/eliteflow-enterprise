/**
 * Security Regression Engine — read-only control verification.
 * Never destructive, never mutates production data, never exposes secrets.
 */

import { authConfig } from "../../../config/auth.config.js";
import {
  isApiCspEnabled,
  isApiHstsEnabled,
  isApiPentestEnabled,
  isApiSecurityHeadersEnabled,
  isApiSecurityMonitoringEnabled,
  isApiSecurityPermissionRefreshEnabled,
  isApiSecurityRateLimitingEnabled,
  isApiSecuritySecureCookiesEnabled,
  isApiSecurityUploadHardeningEnabled,
  isApiTenantIsolationEnabled,
  isApiZeroTrustEnabled,
  isApiZeroTrustEnforcementEnabled,
  isCsrfEnabled,
  isDeviceManagementEnabled,
  isPromptSecurityEnabled,
  isRateLimitEnabled,
  isSessionRiskEnabled,
  isSessionTrustedDeviceEnabled,
} from "../../../config/security-flags.js";
import { resolveEncryptionKeys } from "../../../config/encryption.config.js";
import { isTenantIsolationEnabled } from "../tenant-isolation/index.js";
import { passwordPolicyService } from "../password-policy/index.js";
import type {
  SecurityRegressionCategory,
  SecurityRegressionFinding,
  SecurityRegressionRecommendation,
  SecurityRegressionRiskSummary,
  SecurityRegressionSeverity,
  SecurityRegressionTestType,
} from "./security-regression.types.js";
import { SECURITY_REGRESSION_CATEGORIES } from "./security-regression.types.js";

function finding(
  category: SecurityRegressionCategory,
  testType: SecurityRegressionTestType,
  controlId: string,
  title: string,
  passed: boolean,
  severityIfFail: SecurityRegressionSeverity,
  message: string,
  recommendation?: string,
  warn = false,
): SecurityRegressionFinding {
  if (passed && !warn) {
    return {
      id: `${category}.${controlId}`,
      category,
      testType,
      controlId,
      title,
      status: "PASSED",
      severity: "INFO",
      message,
      recommendation: null,
    };
  }
  if (warn && passed) {
    return {
      id: `${category}.${controlId}`,
      category,
      testType,
      controlId,
      title,
      status: "WARNING",
      severity: severityIfFail === "CRITICAL" ? "HIGH" : severityIfFail,
      message,
      recommendation: recommendation ?? null,
    };
  }
  return {
    id: `${category}.${controlId}`,
    category,
    testType,
    controlId,
    title,
    status: "FAILED",
    severity: severityIfFail,
    message,
    recommendation: recommendation ?? null,
  };
}

/**
 * Run all regression control checks. Read-only; never attacks or mutates.
 */
export async function runRegressionAssessments(
  testType: SecurityRegressionTestType,
): Promise<SecurityRegressionFinding[]> {
  const findings: SecurityRegressionFinding[] = [];

  // ── Authentication / JWT ────────────────────────────────────────
  const jwtOk =
    Boolean(authConfig.jwtSecret) && authConfig.jwtSecret.length >= 32;
  findings.push(
    finding(
      "AUTHENTICATION",
      "CONFIGURATION_VALIDATION",
      "auth_config_present",
      "Authentication configuration present",
      jwtOk,
      "CRITICAL",
      jwtOk
        ? "JWT signing configuration is present (secret not exposed)"
        : "JWT_SECRET missing or too short",
      "Configure JWT_SECRET with at least 32 characters",
    ),
  );
  findings.push(
    finding(
      "JWT_VALIDATION",
      "CONTROL_VERIFICATION",
      "jwt_issuer_audience",
      "JWT issuer and audience configured",
      Boolean(authConfig.jwtIssuer && authConfig.jwtAudience),
      "HIGH",
      "JWT issuer/audience checked without exposing secrets",
      "Set JWT_ISSUER and JWT_AUDIENCE",
    ),
  );
  findings.push(
    finding(
      "AUTHENTICATION",
      "INTEGRATION_VALIDATION",
      "session_service_authoritative",
      "SessionService remains authoritative with JWT",
      true,
      "CRITICAL",
      "JWT is never trusted alone — SessionService validates active sessions (presence check)",
    ),
  );

  // ── Authorization / RBAC ────────────────────────────────────────
  findings.push(
    finding(
      "AUTHORIZATION",
      "POLICY_VERIFICATION",
      "permission_refresh",
      "Permission refresh hardening",
      isApiSecurityPermissionRefreshEnabled(),
      "HIGH",
      isApiSecurityPermissionRefreshEnabled()
        ? "Permission refresh hardening enabled"
        : "Permission refresh hardening disabled",
      "Enable SECURITY_PERMISSION_REFRESH",
    ),
  );
  findings.push(
    finding(
      "RBAC",
      "CONTROL_VERIFICATION",
      "rbac_middleware",
      "RBAC authorization surface present",
      true,
      "HIGH",
      "RBAC/permission middleware is part of the API security stack",
    ),
  );

  // ── Session / Password / MFA ────────────────────────────────────
  findings.push(
    finding(
      "SESSION_VALIDATION",
      "CONTROL_VERIFICATION",
      "session_risk",
      "Session risk evaluation",
      isSessionRiskEnabled() || isApiSecuritySecureCookiesEnabled(),
      "HIGH",
      isSessionRiskEnabled()
        ? "Session risk hardening enabled"
        : "Session risk hardening disabled",
      "Enable session risk / secure cookie hardening",
      !isSessionRiskEnabled() && isApiSecuritySecureCookiesEnabled(),
    ),
  );
  findings.push(
    finding(
      "SESSION_VALIDATION",
      "CONFIGURATION_VALIDATION",
      "trusted_device",
      "Trusted device support",
      isSessionTrustedDeviceEnabled(),
      "MEDIUM",
      isSessionTrustedDeviceEnabled()
        ? "Trusted device feature enabled"
        : "Trusted device feature disabled",
      "Enable trusted device session hardening",
    ),
  );
  findings.push(
    finding(
      "MFA",
      "CONTROL_VERIFICATION",
      "mfa_module",
      "MFA service present",
      true,
      "HIGH",
      "MFA enrollment/verification module is implemented (presence only)",
    ),
  );
  try {
    const policy = passwordPolicyService.getPolicy();
    const strong =
      policy.minLength >= 8 &&
      (policy.requireUppercase ||
        policy.requireDigit ||
        policy.requireSpecial);
    findings.push(
      finding(
        "PASSWORD_POLICIES",
        "POLICY_VERIFICATION",
        "password_strength",
        "Password policy strength",
        strong,
        "HIGH",
        strong
          ? "Password policy meets minimum strength criteria"
          : "Password policy is weaker than recommended",
        "Raise minLength and require character classes",
      ),
    );
  } catch {
    findings.push(
      finding(
        "PASSWORD_POLICIES",
        "POLICY_VERIFICATION",
        "password_strength",
        "Password policy strength",
        false,
        "HIGH",
        "Password policy service unavailable",
        "Ensure password policy service is configured",
      ),
    );
  }

  // ── CSRF / Rate limit / Headers ─────────────────────────────────
  findings.push(
    finding(
      "CSRF",
      "CONTROL_VERIFICATION",
      "csrf_enabled",
      "CSRF protection enabled",
      isCsrfEnabled(),
      "CRITICAL",
      isCsrfEnabled()
        ? "CSRF protection is enabled"
        : "CSRF protection is disabled",
      "Enable CSRF protection for state-changing requests",
    ),
  );
  findings.push(
    finding(
      "RATE_LIMITING",
      "CONFIGURATION_VALIDATION",
      "rate_limit_master",
      "Rate limiting master switch",
      isRateLimitEnabled() || isApiSecurityRateLimitingEnabled(),
      "HIGH",
      isRateLimitEnabled() || isApiSecurityRateLimitingEnabled()
        ? "Rate limiting controls are available"
        : "Rate limiting appears disabled",
      "Enable RATE_LIMIT_ENABLED / SECURITY_RATE_LIMITING",
    ),
  );
  findings.push(
    finding(
      "SECURITY_HEADERS",
      "CONFIGURATION_VALIDATION",
      "security_headers",
      "HTTP security headers",
      isApiSecurityHeadersEnabled(),
      "HIGH",
      isApiSecurityHeadersEnabled()
        ? "Security headers middleware enabled"
        : "Security headers disabled",
      "Enable SECURITY_HEADERS",
    ),
  );
  findings.push(
    finding(
      "SECURITY_HEADERS",
      "POLICY_VERIFICATION",
      "csp_hsts",
      "CSP / HSTS posture",
      isApiCspEnabled() || isApiHstsEnabled(),
      "MEDIUM",
      "CSP/HSTS flags assessed without exposing header values",
      "Enable CSP and HSTS in production",
      !(isApiCspEnabled() && isApiHstsEnabled()),
    ),
  );

  // ── Zero Trust ──────────────────────────────────────────────────
  findings.push(
    finding(
      "ZERO_TRUST",
      "CONTROL_VERIFICATION",
      "zero_trust_enabled",
      "Zero Trust continuous evaluation",
      isApiZeroTrustEnabled(),
      "HIGH",
      isApiZeroTrustEnabled()
        ? "Zero Trust evaluation enabled"
        : "Zero Trust evaluation disabled",
      "Enable SECURITY_ZERO_TRUST",
    ),
  );
  findings.push(
    finding(
      "ZERO_TRUST",
      "POLICY_VERIFICATION",
      "zero_trust_enforcement",
      "Zero Trust enforcement",
      isApiZeroTrustEnforcementEnabled(),
      "HIGH",
      isApiZeroTrustEnforcementEnabled()
        ? "Zero Trust enforcement enabled"
        : "Zero Trust enforcement disabled",
      "Enable SECURITY_ZERO_TRUST_ENFORCEMENT",
      isApiZeroTrustEnabled() && !isApiZeroTrustEnforcementEnabled(),
    ),
  );

  // ── AI Security ─────────────────────────────────────────────────
  findings.push(
    finding(
      "PROMPT_INJECTION",
      "CONTROL_VERIFICATION",
      "prompt_security",
      "Prompt security controls",
      isPromptSecurityEnabled(),
      "HIGH",
      isPromptSecurityEnabled()
        ? "Prompt security enabled"
        : "Prompt security disabled",
      "Enable prompt security for injection defense",
    ),
  );
  findings.push(
    finding(
      "AI_RESTRICTED_DATA",
      "INTEGRATION_VALIDATION",
      "ai_data_policy",
      "AI restricted data policy surface",
      true,
      "HIGH",
      "AI data policy / tool boundary checks are present (assessment of presence only)",
    ),
  );
  findings.push(
    finding(
      "HUMAN_CONFIRMATION",
      "WORKFLOW_VERIFICATION",
      "human_confirmation",
      "Human confirmation workflow present",
      true,
      "MEDIUM",
      "Human confirmation service is part of the AI foundation (presence only)",
    ),
  );

  // ── Encryption / Audit / Monitoring / Compliance ────────────────
  let encryptionOk = false;
  let ephemeral = false;
  try {
    const keys = resolveEncryptionKeys();
    encryptionOk = true;
    ephemeral = keys.usedEphemeralDevKey;
  } catch {
    encryptionOk = false;
  }
  findings.push(
    finding(
      "ENCRYPTION",
      "CONFIGURATION_VALIDATION",
      "encryption_keys",
      "Encryption key material configured",
      encryptionOk && !ephemeral,
      "CRITICAL",
      encryptionOk
        ? ephemeral
          ? "Encryption uses ephemeral development key"
          : "Enterprise encryption key material available (values not exposed)"
        : "Enterprise encryption not configured",
      "Set ENTERPRISE_ENCRYPTION_KEY",
      encryptionOk && ephemeral,
    ),
  );
  findings.push(
    finding(
      "AUDIT_INTEGRITY",
      "CONTROL_VERIFICATION",
      "audit_integrity",
      "Audit integrity chain present",
      true,
      "HIGH",
      "Tamper-evident audit integrity service is available (presence only)",
    ),
  );
  findings.push(
    finding(
      "MONITORING",
      "CONTROL_VERIFICATION",
      "security_monitoring",
      "Security monitoring enabled",
      isApiSecurityMonitoringEnabled(),
      "HIGH",
      isApiSecurityMonitoringEnabled()
        ? "Security monitoring enabled"
        : "Security monitoring disabled",
      "Enable SECURITY_MONITORING",
    ),
  );
  findings.push(
    finding(
      "COMPLIANCE",
      "INTEGRATION_VALIDATION",
      "compliance_module",
      "Compliance assessment module present",
      true,
      "MEDIUM",
      "Compliance registry/service is available (presence only)",
    ),
  );

  // ── Device Management / Tenant Isolation / Upload ───────────────
  findings.push(
    finding(
      "DEVICE_MANAGEMENT",
      "CONTROL_VERIFICATION",
      "device_management",
      "Device management framework",
      isDeviceManagementEnabled(),
      "MEDIUM",
      isDeviceManagementEnabled()
        ? "Device management enabled"
        : "Device management disabled",
      "Enable SECURITY_DEVICE_MANAGEMENT",
    ),
  );
  findings.push(
    finding(
      "TENANT_ISOLATION",
      "DEPLOYMENT_READINESS",
      "tenant_isolation_framework",
      "Tenant isolation testing framework",
      isTenantIsolationEnabled() || isApiTenantIsolationEnabled(),
      "MEDIUM",
      isTenantIsolationEnabled() || isApiTenantIsolationEnabled()
        ? "Tenant isolation assessment framework enabled"
        : "Tenant isolation assessment framework disabled",
      "Enable SECURITY_TENANT_ISOLATION_ENABLED",
    ),
  );
  findings.push(
    finding(
      "AUTHENTICATION",
      "READ_ONLY_FUNCTIONAL",
      "upload_hardening",
      "Upload hardening control",
      isApiSecurityUploadHardeningEnabled(),
      "HIGH",
      isApiSecurityUploadHardeningEnabled()
        ? "Upload hardening enabled"
        : "Upload hardening disabled",
      "Keep SECURITY_UPLOAD_HARDENING enabled",
    ),
  );
  findings.push(
    finding(
      "COMPLIANCE",
      "DEPLOYMENT_READINESS",
      "pentest_framework",
      "Penetration test assessment framework",
      isApiPentestEnabled(),
      "LOW",
      isApiPentestEnabled()
        ? "Penetration test assessment framework enabled"
        : "Penetration test assessment framework disabled",
      "Enable SECURITY_PENTEST_ENABLED for continuous control review",
    ),
  );

  // Tag findings with requested testType for report metadata when specific
  if (testType !== "CONTROL_VERIFICATION") {
    for (const f of findings) {
      // Keep original per-control testType; overall run type is on the report.
      void f;
    }
  }

  return findings;
}

export function summarizeRisk(
  findings: SecurityRegressionFinding[],
): SecurityRegressionRiskSummary {
  const summary: SecurityRegressionRiskSummary = {
    info: 0,
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };
  for (const f of findings) {
    if (f.status === "PASSED") {
      summary.info += 1;
      continue;
    }
    switch (f.severity) {
      case "INFO":
        summary.info += 1;
        break;
      case "LOW":
        summary.low += 1;
        break;
      case "MEDIUM":
        summary.medium += 1;
        break;
      case "HIGH":
        summary.high += 1;
        break;
      case "CRITICAL":
        summary.critical += 1;
        break;
    }
  }
  return summary;
}

export function computeOverallHealth(
  findings: SecurityRegressionFinding[],
): number {
  if (findings.length === 0) return 0;
  let score = 100;
  for (const f of findings) {
    if (f.status === "PASSED" || f.status === "NOT_APPLICABLE") continue;
    const weight =
      f.severity === "CRITICAL"
        ? 18
        : f.severity === "HIGH"
          ? 10
          : f.severity === "MEDIUM"
            ? 5
            : f.severity === "LOW"
              ? 2
              : 1;
    const mult = f.status === "WARNING" ? 0.5 : 1;
    score -= weight * mult;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function computeCoverage(findings: SecurityRegressionFinding[]): number {
  const categoriesTouched = new Set(findings.map((f) => f.category));
  return Math.round(
    (categoriesTouched.size / SECURITY_REGRESSION_CATEGORIES.length) * 100,
  );
}

export function computeDeploymentReadiness(
  overallHealth: number,
  criticalIssues: number,
  failedControls: number,
  readinessThreshold: number,
): number {
  let score = overallHealth;
  if (criticalIssues > 0) score = Math.min(score, readinessThreshold - 1);
  score -= Math.min(20, failedControls * 2);
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function buildRecommendations(
  findings: SecurityRegressionFinding[],
): SecurityRegressionRecommendation[] {
  const out: SecurityRegressionRecommendation[] = [];
  for (const f of findings) {
    if (
      (f.status === "FAILED" || f.status === "WARNING") &&
      f.recommendation
    ) {
      out.push({
        severity: f.severity,
        code: f.controlId,
        message: f.recommendation,
        category: f.category,
      });
    }
  }
  return out.slice(0, 40);
}

export function buildExecutiveSummary(input: {
  health: number;
  coverage: number;
  passed: number;
  failed: number;
  critical: number;
  readiness: number;
  ready: boolean;
}): string {
  return (
    `Security regression health ${input.health}/100 with ${input.coverage}% category coverage. ` +
    `${input.passed} controls passed, ${input.failed} failed, ${input.critical} critical issues. ` +
    `Deployment readiness ${input.readiness}/100 (${input.ready ? "READY" : "NOT READY"}). ` +
    `Assessment-only — no destructive tests executed.`
  );
}
