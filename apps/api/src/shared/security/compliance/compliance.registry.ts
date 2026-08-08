import type {
  ComplianceControlDefinition,
  ComplianceEvidenceSource,
} from "./compliance.types.js";

/**
 * Static control registry — maps implemented EliteFlow security features
 * to ISO 27001, SOC 2, GDPR, NIST CSF, and Internal Enterprise Controls.
 */
export const COMPLIANCE_CONTROL_REGISTRY: ComplianceControlDefinition[] = [
  {
    id: "CTRL-MFA-001",
    title: "Administrative Multi-Factor Authentication",
    description:
      "MFA enrollment and verification for Admin and Super Admin roles.",
    frameworks: ["ISO_27001", "SOC_2", "NIST_CSF", "INTERNAL"],
    category: "Identity & Access",
    owner: "Security",
    evidenceSources: ["mfa"],
    inherentRisk: "HIGH",
  },
  {
    id: "CTRL-ENC-001",
    title: "Enterprise Field Encryption",
    description:
      "AES-backed encryption service for sensitive at-rest application secrets and MFA material.",
    frameworks: ["ISO_27001", "SOC_2", "GDPR", "NIST_CSF", "INTERNAL"],
    category: "Cryptography",
    owner: "Security",
    evidenceSources: ["encryption"],
    inherentRisk: "CRITICAL",
  },
  {
    id: "CTRL-AUD-001",
    title: "Tamper-Evident Audit Integrity Chain",
    description:
      "Hash-chained audit log integrity with verification and export controls.",
    frameworks: ["ISO_27001", "SOC_2", "GDPR", "NIST_CSF", "INTERNAL"],
    category: "Logging & Monitoring",
    owner: "Security",
    evidenceSources: ["audit_chain"],
    inherentRisk: "HIGH",
  },
  {
    id: "CTRL-ZT-001",
    title: "Zero Trust Continuous Authorization",
    description:
      "Request and session trust evaluation with risk-based allow, step-up, or block.",
    frameworks: ["ISO_27001", "SOC_2", "NIST_CSF", "INTERNAL"],
    category: "Access Control",
    owner: "Security",
    evidenceSources: ["zero_trust"],
    inherentRisk: "HIGH",
  },
  {
    id: "CTRL-AI-001",
    title: "AI Restricted Data Guard",
    description:
      "Policy enforcement preventing restricted/confidential data leakage into AI prompts.",
    frameworks: ["ISO_27001", "SOC_2", "GDPR", "INTERNAL"],
    category: "Data Protection",
    owner: "Security",
    evidenceSources: ["ai_data_guard"],
    inherentRisk: "HIGH",
  },
  {
    id: "CTRL-MON-001",
    title: "Security Monitoring & Threat Detection",
    description:
      "Rule-based threat detection, correlation, and security incident tracking.",
    frameworks: ["ISO_27001", "SOC_2", "NIST_CSF", "INTERNAL"],
    category: "Logging & Monitoring",
    owner: "Security",
    evidenceSources: ["security_monitoring"],
    inherentRisk: "MEDIUM",
  },
  {
    id: "CTRL-RET-001",
    title: "Data Retention & Secure Deletion",
    description:
      "Retention lifecycle policies, legal hold, and secure deletion orchestration.",
    frameworks: ["ISO_27001", "SOC_2", "GDPR", "INTERNAL"],
    category: "Data Lifecycle",
    owner: "Security",
    evidenceSources: ["retention"],
    inherentRisk: "HIGH",
  },
  {
    id: "CTRL-BCDR-001",
    title: "Business Continuity & Disaster Recovery Orchestration",
    description:
      "Service health tracking, recovery modes, and centralized recovery policy decisions.",
    frameworks: ["ISO_27001", "SOC_2", "NIST_CSF", "INTERNAL"],
    category: "Resilience",
    owner: "Security",
    evidenceSources: ["bcdr"],
    inherentRisk: "HIGH",
  },
  {
    id: "CTRL-UPL-001",
    title: "Upload Security Hardening",
    description:
      "Upload validation, MIME detection, antivirus hooks, and production fail-closed hardening.",
    frameworks: ["ISO_27001", "SOC_2", "NIST_CSF", "INTERNAL"],
    category: "Application Security",
    owner: "Security",
    evidenceSources: ["upload_security"],
    inherentRisk: "HIGH",
  },
  {
    id: "CTRL-RBAC-001",
    title: "Role-Based Access Control",
    description:
      "Central permission catalog, role hierarchy, and route/module authorization checks.",
    frameworks: ["ISO_27001", "SOC_2", "NIST_CSF", "GDPR", "INTERNAL"],
    category: "Access Control",
    owner: "Security",
    evidenceSources: ["rbac"],
    inherentRisk: "CRITICAL",
  },
  {
    id: "CTRL-ACL-001",
    title: "Field-Level Authorization (ACL)",
    description:
      "DTO field authorization and sensitive data masking by classification and permission.",
    frameworks: ["ISO_27001", "SOC_2", "GDPR", "INTERNAL"],
    category: "Access Control",
    owner: "Security",
    evidenceSources: ["acl"],
    inherentRisk: "HIGH",
  },
  {
    id: "CTRL-SOD-001",
    title: "Separation of Duties",
    description:
      "SoD policy enforcement for elevated and conflicting administrative actions.",
    frameworks: ["ISO_27001", "SOC_2", "NIST_CSF", "INTERNAL"],
    category: "Governance",
    owner: "Security",
    evidenceSources: ["sod"],
    inherentRisk: "HIGH",
  },
];

export const FRAMEWORK_META: Record<
  string,
  { label: string; description: string }
> = {
  ISO_27001: {
    label: "ISO/IEC 27001",
    description: "Information security management system controls",
  },
  SOC_2: {
    label: "SOC 2",
    description: "Trust Services Criteria for security and availability",
  },
  GDPR: {
    label: "GDPR",
    description: "EU data protection and privacy requirements",
  },
  NIST_CSF: {
    label: "NIST CSF",
    description: "NIST Cybersecurity Framework Identify–Protect–Detect–Respond–Recover",
  },
  INTERNAL: {
    label: "Internal Enterprise Controls",
    description: "EliteFlow platform security governance baseline",
  },
};

export function evidenceSourceLabel(source: ComplianceEvidenceSource): string {
  switch (source) {
    case "mfa":
      return "Multi-Factor Authentication";
    case "encryption":
      return "Enterprise Encryption";
    case "audit_chain":
      return "Audit Integrity Chain";
    case "zero_trust":
      return "Zero Trust Authorization";
    case "ai_data_guard":
      return "AI Data Guard";
    case "security_monitoring":
      return "Security Monitoring";
    case "retention":
      return "Data Retention";
    case "bcdr":
      return "Business Continuity & DR";
    case "upload_security":
      return "Upload Security";
    case "rbac":
      return "RBAC";
    case "acl":
      return "Field ACL";
    case "sod":
      return "Separation of Duties";
    default: {
      const _exhaustive: never = source;
      return _exhaustive;
    }
  }
}
