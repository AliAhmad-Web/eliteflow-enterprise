/**
 * Enterprise Security Regression Testing — types.
 * Assessment only — never destructive, never mutates production data.
 */

export const SECURITY_REGRESSION_CATEGORIES = [
  "AUTHENTICATION",
  "AUTHORIZATION",
  "JWT_VALIDATION",
  "SESSION_VALIDATION",
  "PASSWORD_POLICIES",
  "MFA",
  "CSRF",
  "RATE_LIMITING",
  "SECURITY_HEADERS",
  "ZERO_TRUST",
  "RBAC",
  "AI_RESTRICTED_DATA",
  "PROMPT_INJECTION",
  "HUMAN_CONFIRMATION",
  "ENCRYPTION",
  "AUDIT_INTEGRITY",
  "MONITORING",
  "COMPLIANCE",
  "DEVICE_MANAGEMENT",
  "TENANT_ISOLATION",
] as const;

export type SecurityRegressionCategory =
  (typeof SECURITY_REGRESSION_CATEGORIES)[number];

export const SECURITY_REGRESSION_TEST_TYPES = [
  "CONFIGURATION_VALIDATION",
  "POLICY_VERIFICATION",
  "CONTROL_VERIFICATION",
  "WORKFLOW_VERIFICATION",
  "READ_ONLY_FUNCTIONAL",
  "INTEGRATION_VALIDATION",
  "DEPLOYMENT_READINESS",
] as const;

export type SecurityRegressionTestType =
  (typeof SECURITY_REGRESSION_TEST_TYPES)[number];

export const SECURITY_REGRESSION_SEVERITIES = [
  "INFO",
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
] as const;

export type SecurityRegressionSeverity =
  (typeof SECURITY_REGRESSION_SEVERITIES)[number];

export const SECURITY_REGRESSION_CONTROL_STATUSES = [
  "PASSED",
  "FAILED",
  "WARNING",
  "NOT_APPLICABLE",
] as const;

export type SecurityRegressionControlStatus =
  (typeof SECURITY_REGRESSION_CONTROL_STATUSES)[number];

export const SECURITY_REGRESSION_EVENTS = {
  SECURITY_REGRESSION_STARTED: "SECURITY_REGRESSION_STARTED",
  SECURITY_REGRESSION_COMPLETED: "SECURITY_REGRESSION_COMPLETED",
  SECURITY_REGRESSION_FAILED: "SECURITY_REGRESSION_FAILED",
  SECURITY_CONTROL_FAILED: "SECURITY_CONTROL_FAILED",
  DEPLOYMENT_NOT_READY: "DEPLOYMENT_NOT_READY",
} as const;

export type SecurityRegressionEvent =
  (typeof SECURITY_REGRESSION_EVENTS)[keyof typeof SECURITY_REGRESSION_EVENTS];

export interface SecurityRegressionFinding {
  id: string;
  category: SecurityRegressionCategory;
  testType: SecurityRegressionTestType;
  controlId: string;
  title: string;
  status: SecurityRegressionControlStatus;
  severity: SecurityRegressionSeverity;
  message: string;
  recommendation: string | null;
}

export interface SecurityRegressionRiskSummary {
  info: number;
  low: number;
  medium: number;
  high: number;
  critical: number;
}

export interface SecurityRegressionRecommendation {
  severity: SecurityRegressionSeverity;
  code: string;
  message: string;
  category: SecurityRegressionCategory;
}

export interface SecurityRegressionReport {
  runId: string;
  testType: SecurityRegressionTestType;
  overallHealth: number;
  coverage: number;
  deploymentReadinessScore: number;
  passedControls: number;
  failedControls: number;
  warningControls: number;
  criticalIssues: number;
  findings: SecurityRegressionFinding[];
  riskSummary: SecurityRegressionRiskSummary;
  recommendations: SecurityRegressionRecommendation[];
  executiveSummary: string;
  categoriesAssessed: number;
  startedAt: string;
  completedAt: string;
  triggeredBy: string | null;
  nextAssessmentAt: string | null;
  /** Always true — framework never executes destructive tests. */
  assessmentOnly: true;
}

export interface SecurityRegressionStatusSnapshot {
  enabled: boolean;
  overallHealth: number;
  coverage: number;
  failedControls: number;
  criticalIssues: number;
  deploymentReadinessScore: number;
  recommendations: number;
  lastAssessmentAt: string | null;
  nextAssessmentAt: string | null;
  evaluatedAt: string;
}

export interface SecurityRegressionHistoryEntry {
  runId: string;
  testType: SecurityRegressionTestType;
  overallHealth: number;
  coverage: number;
  failedControls: number;
  criticalIssues: number;
  deploymentReadinessScore: number;
  completedAt: string;
  triggeredBy: string | null;
}

export interface SecurityRegressionDashboardMetrics {
  overallHealth: number;
  coverage: number;
  failedControls: number;
  deploymentReadiness: number;
  recommendations: number;
  history: number;
  lastAssessmentAt: string | null;
}
