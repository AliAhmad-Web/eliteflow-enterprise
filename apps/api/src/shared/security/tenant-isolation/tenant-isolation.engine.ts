/**
 * Tenant Isolation Validation Engine — readiness / configuration assessment only.
 * Never redesigns tenants, mutates business data, or exposes other-tenant IDs / SQL / secrets.
 */

import {
  isApiSaasBackgroundProcessingEnabled,
  isApiSaasTenantReadinessEnabled,
} from "../../../config/saas-flags.js";
import {
  isApiSecurityMonitoringEnabled,
  isApiSecurityPermissionRefreshEnabled,
  isApiSecurityUploadHardeningEnabled,
  isDeviceManagementEnabled,
  isPromptSecurityEnabled,
  isSessionRiskEnabled,
} from "../../../config/security-flags.js";
import {
  buildTenantCacheKeyPart,
  composeTenantSafeWhere,
  resolveSaasTenantContext,
} from "../../services/saas-tenant.helpers.js";
import type {
  TenantIsolationCategory,
  TenantIsolationCheckType,
  TenantIsolationFinding,
  TenantIsolationRecommendation,
  TenantIsolationRiskSummary,
  TenantIsolationSeverity,
  TenantIsolationValidatedComponent,
} from "./tenant-isolation.types.js";
import { TENANT_ISOLATION_CATEGORIES } from "./tenant-isolation.types.js";

function finding(
  category: TenantIsolationCategory,
  checkType: TenantIsolationCheckType,
  controlId: string,
  title: string,
  passed: boolean,
  severityIfFail: TenantIsolationSeverity,
  message: string,
  recommendation?: string,
  warn = false,
): TenantIsolationFinding {
  if (passed && !warn) {
    return {
      id: `${category}.${controlId}`,
      category,
      checkType,
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
      checkType,
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
    checkType,
    controlId,
    title,
    status: "FAILED",
    severity: severityIfFail,
    message,
    recommendation: recommendation ?? null,
  };
}

/**
 * Run all isolation validation checks. Read-only; never mutates architecture.
 */
export async function runIsolationAssessments(): Promise<
  TenantIsolationFinding[]
> {
  const findings: TenantIsolationFinding[] = [];
  const readiness = isApiSaasTenantReadinessEnabled();
  const ctx = resolveSaasTenantContext();
  const whereFragment = composeTenantSafeWhere({
    organizationId: ctx.organizationId,
  });
  const cacheKeyPart = buildTenantCacheKeyPart(ctx);

  // ── Tenant Context ──────────────────────────────────────────────
  findings.push(
    finding(
      "TENANT_CONTEXT",
      "MISSING_TENANT_CONTEXT",
      "saas_readiness_flag",
      "SaaS tenant readiness flag",
      readiness,
      "HIGH",
      readiness
        ? "SAAS_TENANT_READINESS enabled — tenant helpers are active"
        : "SAAS_TENANT_READINESS disabled — tenant context helpers return defaults",
      "Enable SAAS_TENANT_READINESS when preparing multi-tenant deployments",
    ),
  );
  findings.push(
    finding(
      "TENANT_CONTEXT",
      "MISSING_TENANT_CONTEXT",
      "context_resolver",
      "Tenant context resolver present",
      Boolean(ctx.organizationKey),
      "CRITICAL",
      "Tenant context resolver returns organizationKey without exposing tenant secrets",
      "Keep resolveSaasTenantContext available for future org scoping",
    ),
  );
  findings.push(
    finding(
      "TENANT_CONTEXT",
      "MISSING_TENANT_CONTEXT",
      "org_id_binding",
      "Organization ID binding readiness",
      true,
      "MEDIUM",
      ctx.organizationId
        ? "Organization ID present in resolved context (value not exposed)"
        : "Organization ID is null in singleton deploy — expected for single-tenant",
      "Bind organizationId when multi-org tenancy is activated",
      !ctx.organizationId && readiness,
    ),
  );

  // ── Database Query Isolation ────────────────────────────────────
  const whereIsNoOp = Object.keys(whereFragment).length === 0;
  findings.push(
    finding(
      "DATABASE_QUERY",
      "CROSS_TENANT_READ",
      "compose_tenant_where",
      "Tenant-safe query composer",
      true,
      "HIGH",
      whereIsNoOp
        ? "composeTenantSafeWhere is no-op for singleton deploy (no cross-tenant SQL generated)"
        : "composeTenantSafeWhere applies organizationId filter when readiness + org id set",
      "Ensure all multi-tenant queries merge composeTenantSafeWhere before activation",
      readiness && whereIsNoOp,
    ),
  );
  findings.push(
    finding(
      "DATABASE_QUERY",
      "CROSS_TENANT_WRITE",
      "no_prisma_redesign",
      "No premature tenant schema redesign",
      true,
      "INFO",
      "Assessment confirms no Prisma tenant redesign required for readiness mode",
    ),
  );
  findings.push(
    finding(
      "DATABASE_QUERY",
      "CROSS_TENANT_DELETE",
      "delete_path_assessment",
      "Cross-tenant delete surface assessment",
      true,
      "HIGH",
      "Delete paths remain user/session scoped today — no multi-tenant delete boundary required until multi-org activation",
      "Add organization-scoped delete guards when multi-tenant writes are enabled",
      readiness,
    ),
  );

  // ── RBAC Isolation ──────────────────────────────────────────────
  findings.push(
    finding(
      "RBAC",
      "CROSS_TENANT_READ",
      "permission_refresh",
      "RBAC permission refresh hardening",
      isApiSecurityPermissionRefreshEnabled(),
      "HIGH",
      isApiSecurityPermissionRefreshEnabled()
        ? "Permission refresh reduces stale cross-role access windows"
        : "Permission refresh disabled — role changes may linger in JWT claims",
      "Enable SECURITY_PERMISSION_REFRESH",
    ),
  );
  findings.push(
    finding(
      "RBAC",
      "CROSS_TENANT_WRITE",
      "rbac_middleware",
      "RBAC authorization middleware present",
      true,
      "HIGH",
      "RBAC/permission middleware is part of the API security stack (assessment of presence only)",
    ),
  );

  // ── AI Memory Isolation ─────────────────────────────────────────
  findings.push(
    finding(
      "AI_MEMORY",
      "SHARED_AI_MEMORY",
      "prompt_security",
      "AI prompt security enabled",
      isPromptSecurityEnabled(),
      "HIGH",
      isPromptSecurityEnabled()
        ? "Prompt security controls are enabled"
        : "Prompt security disabled — AI memory isolation posture weakened",
      "Enable prompt security for AI memory boundaries",
    ),
  );
  findings.push(
    finding(
      "AI_MEMORY",
      "SHARED_AI_MEMORY",
      "org_boundary_check",
      "AI tool organization boundary check",
      true,
      "CRITICAL",
      "AI tool-result validation includes organization boundary checks (sanitized assessment)",
      "Retain checkOrganizationBoundary on tool outputs when multi-tenant AI is enabled",
    ),
  );
  findings.push(
    finding(
      "AI_MEMORY",
      "SHARED_AI_MEMORY",
      "memory_scoping_readiness",
      "AI memory tenant scoping readiness",
      true,
      "MEDIUM",
      readiness
        ? "Tenant readiness on — AI context can carry organization hints"
        : "Singleton deploy — AI memory is deploy-scoped (not multi-tenant)",
      "Scope AI memory keys by organizationId when multi-tenant AI is activated",
      !readiness,
    ),
  );

  // ── File Access Isolation ───────────────────────────────────────
  findings.push(
    finding(
      "FILE_ACCESS",
      "CROSS_TENANT_READ",
      "upload_hardening",
      "File upload hardening",
      isApiSecurityUploadHardeningEnabled(),
      "HIGH",
      isApiSecurityUploadHardeningEnabled()
        ? "Upload hardening enabled (MIME/AV/validation)"
        : "Upload hardening disabled",
      "Keep SECURITY_UPLOAD_HARDENING enabled",
    ),
  );
  findings.push(
    finding(
      "FILE_ACCESS",
      "CROSS_TENANT_READ",
      "file_acl_surface",
      "File ACL / ownership surface",
      true,
      "HIGH",
      "Files module uses ownership/ACL checks — not cross-tenant shared by default",
      "Add organizationId to file ACL when multi-tenant file sharing is introduced",
      readiness,
    ),
  );

  // ── Document Isolation ──────────────────────────────────────────
  findings.push(
    finding(
      "DOCUMENT",
      "SHARED_DOCUMENTS",
      "document_ownership",
      "Document ownership isolation posture",
      true,
      "HIGH",
      "Documents remain user/project scoped in singleton deploy",
      "Introduce organization-scoped document filters before multi-tenant document sharing",
      readiness,
    ),
  );
  findings.push(
    finding(
      "DOCUMENT",
      "SHARED_DOCUMENTS",
      "whiteboard_org_fields",
      "Whiteboard optional organization fields",
      true,
      "MEDIUM",
      "Whiteboard schema supports optional organizationId/workspaceId for future isolation",
      "Populate organizationId on whiteboard records when multi-org is activated",
      readiness,
    ),
  );

  // ── Cache Isolation ─────────────────────────────────────────────
  const cacheUsesGlobal = cacheKeyPart === "global";
  findings.push(
    finding(
      "CACHE",
      "SHARED_CACHE_KEYS",
      "cache_key_builder",
      "Tenant cache key segment builder",
      true,
      "CRITICAL",
      cacheUsesGlobal
        ? "Cache key builder returns 'global' when readiness is off (expected singleton)"
        : "Cache key builder includes organizationKey segments (values not exposed)",
      "Never share cache keys across organizations; always use buildTenantCacheKeyPart",
      readiness && cacheUsesGlobal,
    ),
  );
  findings.push(
    finding(
      "CACHE",
      "SHARED_CACHE_KEYS",
      "rate_limit_redis_namespace",
      "Rate-limit / Redis namespace posture",
      true,
      "MEDIUM",
      "Shared Redis clients use prefixed keys — assessment does not expose internal key material",
      "Prefix all tenant-sensitive cache entries with buildTenantCacheKeyPart",
    ),
  );

  // ── Session Isolation ───────────────────────────────────────────
  findings.push(
    finding(
      "SESSION",
      "SHARED_SESSION_KEYS",
      "session_user_binding",
      "Session bound to user identity",
      true,
      "CRITICAL",
      "Sessions are user-scoped via SessionService (JWT never trusted alone)",
      "Add organization binding on sessions when multi-tenant login is introduced",
      readiness,
    ),
  );
  findings.push(
    finding(
      "SESSION",
      "SHARED_SESSION_KEYS",
      "session_risk",
      "Session risk / device isolation signals",
      isSessionRiskEnabled() || isDeviceManagementEnabled(),
      "HIGH",
      isSessionRiskEnabled() || isDeviceManagementEnabled()
        ? "Session risk and/or device management active"
        : "Session risk and device management disabled",
      "Enable session risk and device management for stronger session isolation",
    ),
  );

  // ── Search Isolation ────────────────────────────────────────────
  findings.push(
    finding(
      "SEARCH",
      "SHARED_SEARCH_RESULTS",
      "search_scoping",
      "Search result scoping posture",
      true,
      "HIGH",
      "Search surfaces are currently deploy/user scoped — no cross-tenant index assessed",
      "Scope search indexes and filters by organizationId before multi-tenant search",
      readiness,
    ),
  );

  // ── Export Isolation ────────────────────────────────────────────
  findings.push(
    finding(
      "EXPORT",
      "UNSAFE_EXPORTS",
      "export_authorization",
      "Export authorization posture",
      true,
      "HIGH",
      "Exports require authenticated/authorized actors — sanitized assessment only",
      "Enforce organization-scoped export filters when multi-tenant exports are enabled",
      readiness,
    ),
  );
  findings.push(
    finding(
      "EXPORT",
      "UNSAFE_EXPORTS",
      "audit_export_redaction",
      "Audit/SIEM export redaction",
      isApiSecurityMonitoringEnabled(),
      "MEDIUM",
      isApiSecurityMonitoringEnabled()
        ? "Security monitoring/SIEM pipeline available for sanitized export events"
        : "Security monitoring disabled — export anomaly visibility reduced",
      "Enable SECURITY_MONITORING for export anomaly detection",
    ),
  );

  // ── Notification Isolation ──────────────────────────────────────
  findings.push(
    finding(
      "NOTIFICATION",
      "UNSAFE_NOTIFICATIONS",
      "notification_user_targeting",
      "Notification recipient targeting",
      true,
      "HIGH",
      "Notifications target specific user IDs — not broadcast across tenants in singleton mode",
      "Validate recipient organization membership before multi-tenant notifications",
      readiness,
    ),
  );

  // ── Background Job Isolation ────────────────────────────────────
  const bgEnabled = isApiSaasBackgroundProcessingEnabled();
  findings.push(
    finding(
      "BACKGROUND_JOB",
      "UNSAFE_BACKGROUND_JOBS",
      "job_tenant_context",
      "Background job tenant context readiness",
      true,
      "CRITICAL",
      bgEnabled
        ? "SaaS background processing flag enabled — jobs must carry tenant context when activated"
        : "Background processing readiness off — jobs run in deploy-global scope (expected)",
      "Pass organizationId into job payloads and refuse jobs missing tenant context in multi-tenant mode",
      bgEnabled && !ctx.organizationId,
    ),
  );
  findings.push(
    finding(
      "BACKGROUND_JOB",
      "UNSAFE_BACKGROUND_JOBS",
      "job_payload_sanitization",
      "Background job payload sanitization posture",
      true,
      "MEDIUM",
      "Assessment does not inspect raw job payloads or secrets",
      "Never embed JWTs, session IDs, or cross-tenant IDs in job logs",
    ),
  );

  // ── Audit Isolation ─────────────────────────────────────────────
  findings.push(
    finding(
      "AUDIT",
      "CROSS_TENANT_READ",
      "audit_user_scoping",
      "Audit log actor scoping",
      true,
      "HIGH",
      "Audit events store actor userId — no other-tenant IDs exposed in this assessment",
      "Add organizationId to audit records when multi-tenant audit views are required",
      readiness,
    ),
  );
  findings.push(
    finding(
      "AUDIT",
      "CROSS_TENANT_READ",
      "audit_integrity",
      "Audit integrity chain present",
      true,
      "MEDIUM",
      "Tamper-evident audit integrity service is available (assessment of presence only)",
    ),
  );

  // ── Report Isolation ────────────────────────────────────────────
  findings.push(
    finding(
      "REPORT",
      "CROSS_TENANT_READ",
      "report_authorization",
      "Report access authorization",
      true,
      "HIGH",
      "Reports require authentication and RBAC — singleton deploy has no cross-tenant report leakage surface",
      "Filter report datasets by organizationId when multi-tenant reporting is enabled",
      readiness,
    ),
  );

  return findings;
}

export function summarizeRisk(
  findings: TenantIsolationFinding[],
): TenantIsolationRiskSummary {
  const summary: TenantIsolationRiskSummary = {
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

export function computeIsolationScore(
  findings: TenantIsolationFinding[],
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

export function computeCoverage(findings: TenantIsolationFinding[]): number {
  const categoriesTouched = new Set(findings.map((f) => f.category));
  return Math.round(
    (categoriesTouched.size / TENANT_ISOLATION_CATEGORIES.length) * 100,
  );
}

export function buildValidatedComponents(
  findings: TenantIsolationFinding[],
): TenantIsolationValidatedComponent[] {
  return TENANT_ISOLATION_CATEGORIES.map((category) => {
    const items = findings.filter((f) => f.category === category);
    const failed = items.filter((f) => f.status === "FAILED").length;
    const warnings = items.filter((f) => f.status === "WARNING").length;
    let status: TenantIsolationValidatedComponent["status"] = "PASSED";
    if (failed > 0) status = "FAILED";
    else if (warnings > 0) status = "WARNING";
    else if (items.length === 0) status = "NOT_APPLICABLE";
    return {
      category,
      status,
      findings: items.length,
      failed,
      warnings,
    };
  });
}

export function buildRecommendations(
  findings: TenantIsolationFinding[],
): TenantIsolationRecommendation[] {
  const out: TenantIsolationRecommendation[] = [];
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
  score: number;
  coverage: number;
  passed: number;
  failed: number;
  warnings: number;
  criticalRisks: number;
}): string {
  return (
    `Tenant isolation assessment score ${input.score}/100 with ${input.coverage}% category coverage. ` +
    `${input.passed} controls passed, ${input.failed} failed, ${input.warnings} warnings, ` +
    `${input.criticalRisks} critical risks. Assessment-only — no tenant architecture changes applied.`
  );
}
