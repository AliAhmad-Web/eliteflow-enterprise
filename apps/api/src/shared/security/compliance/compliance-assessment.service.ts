import { writeAuditLogSafe } from "../write-audit-log.js";
import { collectAllEvidence } from "./compliance.evidence.js";
import { complianceControlService } from "./compliance-control.service.js";
import { setLastAssessment } from "./compliance.state.js";
import type {
  ComplianceAssessmentResult,
  ComplianceControl,
  ComplianceFramework,
  ComplianceRiskSummary,
  FrameworkScore,
} from "./compliance.types.js";
import { COMPLIANCE_FRAMEWORKS } from "./compliance.types.js";
import { FRAMEWORK_META } from "./compliance.registry.js";

const AUDIT_RESOURCE = "compliance";

function statusPoints(status: ComplianceControl["status"]): number {
  switch (status) {
    case "IMPLEMENTED":
      return 100;
    case "PARTIAL":
      return 60;
    case "NOT_APPLICABLE":
      return 100;
    case "PLANNED":
      return 20;
    case "FAILED":
      return 0;
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function scoreControls(controls: ComplianceControl[]): number {
  if (controls.length === 0) return 0;
  const total = controls.reduce((sum, c) => sum + statusPoints(c.status), 0);
  return Math.round(total / controls.length);
}

function countByStatus(controls: ComplianceControl[]): {
  controlCount: number;
  implemented: number;
  partial: number;
  planned: number;
  failed: number;
  notApplicable: number;
} {
  return {
    controlCount: controls.length,
    implemented: controls.filter((c) => c.status === "IMPLEMENTED").length,
    partial: controls.filter((c) => c.status === "PARTIAL").length,
    planned: controls.filter((c) => c.status === "PLANNED").length,
    failed: controls.filter((c) => c.status === "FAILED").length,
    notApplicable: controls.filter((c) => c.status === "NOT_APPLICABLE")
      .length,
  };
}

function riskSummary(controls: ComplianceControl[]): ComplianceRiskSummary {
  return {
    low: controls.filter((c) => c.risk === "LOW").length,
    medium: controls.filter((c) => c.risk === "MEDIUM").length,
    high: controls.filter((c) => c.risk === "HIGH").length,
    critical: controls.filter((c) => c.risk === "CRITICAL").length,
  };
}

function expandByFramework(controls: ComplianceControl[]): ComplianceControl[] {
  // For framework scoring, expand multi-framework controls into per-framework rows.
  const rows: ComplianceControl[] = [];
  for (const control of controls) {
    for (const framework of control.frameworks) {
      rows.push({ ...control, framework });
    }
  }
  return rows;
}

/**
 * Compliance assessment — scores, gaps, evidence coverage, risk summary.
 */
class ComplianceAssessmentService {
  async runAssessment(actorUserId?: string | null): Promise<ComplianceAssessmentResult> {
    const controls = complianceControlService.listControls();
    const expanded = expandByFramework(controls);
    const evidence = collectAllEvidence();

    const frameworkScores: FrameworkScore[] = COMPLIANCE_FRAMEWORKS.map(
      (framework) => {
        const subset = expanded.filter((c) => c.framework === framework);
        const counts = countByStatus(subset);
        return {
          framework,
          score: scoreControls(subset),
          ...counts,
        };
      },
    );

    const overallScore = scoreControls(controls);
    const missingControls = controls
      .filter(
        (c) => c.status === "PLANNED" || c.status === "PARTIAL",
      )
      .map((c) => ({
        id: c.id,
        title: c.title,
        framework: c.framework,
        status: c.status,
      }));

    const failedControls = controls
      .filter((c) => c.status === "FAILED")
      .map((c) => ({
        id: c.id,
        title: c.title,
        framework: c.framework,
        risk: c.risk,
      }));

    const presentSources = evidence.filter((e) => e.present).length;
    const result: ComplianceAssessmentResult = {
      assessedAt: new Date().toISOString(),
      overallScore,
      frameworkScores,
      missingControls,
      failedControls,
      evidenceCoverage: {
        totalSources: evidence.length,
        presentSources,
        coveragePercent:
          evidence.length === 0
            ? 0
            : Math.round((presentSources / evidence.length) * 100),
        sources: evidence,
      },
      riskSummary: riskSummary(controls),
      controlCount: controls.length,
    };

    setLastAssessment(result);

    await writeAuditLogSafe(
      {
        userId: actorUserId ?? null,
        action: "compliance.evidence_generated",
        resource: AUDIT_RESOURCE,
        metadata: {
          presentSources: result.evidenceCoverage.presentSources,
          totalSources: result.evidenceCoverage.totalSources,
          coveragePercent: result.evidenceCoverage.coveragePercent,
        },
      },
      "compliance",
    );

    await writeAuditLogSafe(
      {
        userId: actorUserId ?? null,
        action: "compliance.assessment_executed",
        resource: AUDIT_RESOURCE,
        metadata: {
          overallScore: result.overallScore,
          controlCount: result.controlCount,
          failedCount: result.failedControls.length,
          missingCount: result.missingControls.length,
          evidenceCoveragePercent: result.evidenceCoverage.coveragePercent,
          frameworks: frameworkScores.map((f) => ({
            framework: f.framework,
            score: f.score,
            label: FRAMEWORK_META[f.framework]?.label,
          })),
        },
      },
      "compliance",
    );

    return result;
  }
}

export const complianceAssessmentService = new ComplianceAssessmentService();
