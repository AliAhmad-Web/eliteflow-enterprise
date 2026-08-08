export const COMPLIANCE_FRAMEWORKS = [
  "ISO_27001",
  "SOC_2",
  "GDPR",
  "NIST_CSF",
  "INTERNAL",
] as const;

export type ComplianceFramework = (typeof COMPLIANCE_FRAMEWORKS)[number];

export const COMPLIANCE_CONTROL_STATUSES = [
  "IMPLEMENTED",
  "PARTIAL",
  "PLANNED",
  "NOT_APPLICABLE",
  "FAILED",
] as const;

export type ComplianceControlStatus =
  (typeof COMPLIANCE_CONTROL_STATUSES)[number];

export const COMPLIANCE_RISK_LEVELS = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
] as const;

export type ComplianceRiskLevel = (typeof COMPLIANCE_RISK_LEVELS)[number];

export const COMPLIANCE_EVIDENCE_SOURCES = [
  "mfa",
  "encryption",
  "audit_chain",
  "zero_trust",
  "ai_data_guard",
  "security_monitoring",
  "retention",
  "bcdr",
  "upload_security",
  "rbac",
  "acl",
  "sod",
] as const;

export type ComplianceEvidenceSource =
  (typeof COMPLIANCE_EVIDENCE_SOURCES)[number];

export interface ComplianceEvidenceItem {
  source: ComplianceEvidenceSource;
  label: string;
  present: boolean;
  detail: string;
  collectedAt: string;
}

export interface ComplianceControlDefinition {
  id: string;
  title: string;
  description: string;
  frameworks: ComplianceFramework[];
  category: string;
  owner: string;
  evidenceSources: ComplianceEvidenceSource[];
  /** Baseline risk when control is not implemented. */
  inherentRisk: ComplianceRiskLevel;
}

export interface ComplianceControl {
  id: string;
  title: string;
  description: string;
  framework: ComplianceFramework;
  frameworks: ComplianceFramework[];
  category: string;
  status: ComplianceControlStatus;
  owner: string;
  evidence: ComplianceEvidenceItem[];
  risk: ComplianceRiskLevel;
  lastVerification: string | null;
  manualOverride: boolean;
  overrideReason: string | null;
}

export interface FrameworkScore {
  framework: ComplianceFramework;
  score: number;
  controlCount: number;
  implemented: number;
  partial: number;
  planned: number;
  failed: number;
  notApplicable: number;
}

export interface ComplianceRiskSummary {
  low: number;
  medium: number;
  high: number;
  critical: number;
}

export interface ComplianceAssessmentResult {
  assessedAt: string;
  overallScore: number;
  frameworkScores: FrameworkScore[];
  missingControls: Array<{ id: string; title: string; framework: ComplianceFramework; status: ComplianceControlStatus }>;
  failedControls: Array<{ id: string; title: string; framework: ComplianceFramework; risk: ComplianceRiskLevel }>;
  evidenceCoverage: {
    totalSources: number;
    presentSources: number;
    coveragePercent: number;
    sources: ComplianceEvidenceItem[];
  };
  riskSummary: ComplianceRiskSummary;
  controlCount: number;
}

export interface ComplianceStatusSnapshot {
  overallScore: number;
  frameworks: FrameworkScore[];
  evidenceCoveragePercent: number;
  lastAssessmentAt: string | null;
  controlCounts: {
    total: number;
    implemented: number;
    partial: number;
    planned: number;
    failed: number;
    notApplicable: number;
  };
  riskSummary: ComplianceRiskSummary;
  evaluatedAt: string;
}
