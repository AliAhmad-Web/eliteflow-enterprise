/**
 * Enterprise Tenant Isolation Testing — types.
 * Assessment only — never mutates tenant architecture or business data.
 */

export const TENANT_ISOLATION_CATEGORIES = [
  "TENANT_CONTEXT",
  "DATABASE_QUERY",
  "RBAC",
  "AI_MEMORY",
  "FILE_ACCESS",
  "DOCUMENT",
  "CACHE",
  "SESSION",
  "SEARCH",
  "EXPORT",
  "NOTIFICATION",
  "BACKGROUND_JOB",
  "AUDIT",
  "REPORT",
] as const;

export type TenantIsolationCategory =
  (typeof TENANT_ISOLATION_CATEGORIES)[number];

export const TENANT_ISOLATION_CHECK_TYPES = [
  "MISSING_TENANT_CONTEXT",
  "CROSS_TENANT_READ",
  "CROSS_TENANT_WRITE",
  "CROSS_TENANT_DELETE",
  "SHARED_CACHE_KEYS",
  "SHARED_SESSION_KEYS",
  "SHARED_AI_MEMORY",
  "SHARED_DOCUMENTS",
  "SHARED_SEARCH_RESULTS",
  "UNSAFE_BACKGROUND_JOBS",
  "UNSAFE_EXPORTS",
  "UNSAFE_NOTIFICATIONS",
] as const;

export type TenantIsolationCheckType =
  (typeof TENANT_ISOLATION_CHECK_TYPES)[number];

export const TENANT_ISOLATION_SEVERITIES = [
  "INFO",
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
] as const;

export type TenantIsolationSeverity =
  (typeof TENANT_ISOLATION_SEVERITIES)[number];

export const TENANT_ISOLATION_CONTROL_STATUSES = [
  "PASSED",
  "FAILED",
  "WARNING",
  "NOT_APPLICABLE",
] as const;

export type TenantIsolationControlStatus =
  (typeof TENANT_ISOLATION_CONTROL_STATUSES)[number];

export const TENANT_ISOLATION_EVENTS = {
  TENANT_ISOLATION_STARTED: "TENANT_ISOLATION_STARTED",
  TENANT_ISOLATION_COMPLETED: "TENANT_ISOLATION_COMPLETED",
  TENANT_CONTEXT_MISSING: "TENANT_CONTEXT_MISSING",
  CROSS_TENANT_ACCESS: "CROSS_TENANT_ACCESS",
  CACHE_ISOLATION_FAILED: "CACHE_ISOLATION_FAILED",
  SESSION_ISOLATION_FAILED: "SESSION_ISOLATION_FAILED",
  AI_ISOLATION_FAILED: "AI_ISOLATION_FAILED",
  FILE_ISOLATION_FAILED: "FILE_ISOLATION_FAILED",
} as const;

export type TenantIsolationEvent =
  (typeof TENANT_ISOLATION_EVENTS)[keyof typeof TENANT_ISOLATION_EVENTS];

export interface TenantIsolationFinding {
  id: string;
  category: TenantIsolationCategory;
  checkType: TenantIsolationCheckType;
  controlId: string;
  title: string;
  status: TenantIsolationControlStatus;
  severity: TenantIsolationSeverity;
  message: string;
  recommendation: string | null;
}

export interface TenantIsolationRiskSummary {
  info: number;
  low: number;
  medium: number;
  high: number;
  critical: number;
}

export interface TenantIsolationRecommendation {
  severity: TenantIsolationSeverity;
  code: string;
  message: string;
  category: TenantIsolationCategory;
}

export interface TenantIsolationValidatedComponent {
  category: TenantIsolationCategory;
  status: TenantIsolationControlStatus;
  findings: number;
  failed: number;
  warnings: number;
}

export interface TenantIsolationReport {
  runId: string;
  isolationScore: number;
  coverage: number;
  validatedComponents: TenantIsolationValidatedComponent[];
  failedComponents: TenantIsolationCategory[];
  criticalRisks: number;
  warnings: number;
  findings: TenantIsolationFinding[];
  riskSummary: TenantIsolationRiskSummary;
  recommendations: TenantIsolationRecommendation[];
  executiveSummary: string;
  categoriesAssessed: number;
  startedAt: string;
  completedAt: string;
  triggeredBy: string | null;
  nextAssessmentAt: string | null;
  /** Always true — framework never redesigns tenants or mutates data. */
  assessmentOnly: true;
}

export interface TenantIsolationStatusSnapshot {
  enabled: boolean;
  isolationScore: number;
  coverage: number;
  criticalRisks: number;
  warnings: number;
  validatedComponents: number;
  failedComponents: number;
  lastAssessmentAt: string | null;
  nextAssessmentAt: string | null;
  evaluatedAt: string;
}

export interface TenantIsolationHistoryEntry {
  runId: string;
  isolationScore: number;
  coverage: number;
  criticalRisks: number;
  warnings: number;
  failedComponents: number;
  completedAt: string;
  triggeredBy: string | null;
}

export interface TenantIsolationDashboardMetrics {
  isolationScore: number;
  coverage: number;
  criticalRisks: number;
  warnings: number;
  history: number;
  lastAssessmentAt: string | null;
}
