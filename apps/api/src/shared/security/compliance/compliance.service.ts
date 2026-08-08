import { complianceAssessmentService } from "./compliance-assessment.service.js";
import { complianceControlService } from "./compliance-control.service.js";
import { collectAllEvidence } from "./compliance.evidence.js";
import { FRAMEWORK_META } from "./compliance.registry.js";
import { getComplianceState } from "./compliance.state.js";
import type {
  ComplianceAssessmentResult,
  ComplianceControl,
  ComplianceFramework,
  ComplianceStatusSnapshot,
  FrameworkScore,
} from "./compliance.types.js";
import { COMPLIANCE_FRAMEWORKS } from "./compliance.types.js";

/**
 * Facade for compliance governance — status, frameworks, controls, assessment.
 */
class ComplianceService {
  async getStatus(): Promise<ComplianceStatusSnapshot> {
    const state = getComplianceState();
    if (state.lastAssessment) {
      return this.snapshotFromAssessment(state.lastAssessment);
    }
    // Lightweight status without persisting a formal assessment run.
    const controls = complianceControlService.listControls();
    const evidence = collectAllEvidence();
    const presentSources = evidence.filter((e) => e.present).length;
    const overallScore = Math.round(
      controls.reduce((sum, c) => {
        switch (c.status) {
          case "IMPLEMENTED":
          case "NOT_APPLICABLE":
            return sum + 100;
          case "PARTIAL":
            return sum + 60;
          case "PLANNED":
            return sum + 20;
          case "FAILED":
            return sum + 0;
          default: {
            const _exhaustive: never = c.status;
            return _exhaustive;
          }
        }
      }, 0) / Math.max(controls.length, 1),
    );

    const frameworks = COMPLIANCE_FRAMEWORKS.map((framework) => {
      const subset = controls.filter((c) => c.frameworks.includes(framework));
      const score =
        subset.length === 0
          ? 0
          : Math.round(
              subset.reduce((sum, c) => {
                switch (c.status) {
                  case "IMPLEMENTED":
                  case "NOT_APPLICABLE":
                    return sum + 100;
                  case "PARTIAL":
                    return sum + 60;
                  case "PLANNED":
                    return sum + 20;
                  case "FAILED":
                    return sum + 0;
                  default: {
                    const _exhaustive: never = c.status;
                    return _exhaustive;
                  }
                }
              }, 0) / subset.length,
            );
      return {
        framework,
        score,
        controlCount: subset.length,
        implemented: subset.filter((c) => c.status === "IMPLEMENTED").length,
        partial: subset.filter((c) => c.status === "PARTIAL").length,
        planned: subset.filter((c) => c.status === "PLANNED").length,
        failed: subset.filter((c) => c.status === "FAILED").length,
        notApplicable: subset.filter((c) => c.status === "NOT_APPLICABLE")
          .length,
      };
    });

    return {
      overallScore,
      frameworks,
      evidenceCoveragePercent:
        evidence.length === 0
          ? 0
          : Math.round((presentSources / evidence.length) * 100),
      lastAssessmentAt: null,
      controlCounts: {
        total: controls.length,
        implemented: controls.filter((c) => c.status === "IMPLEMENTED").length,
        partial: controls.filter((c) => c.status === "PARTIAL").length,
        planned: controls.filter((c) => c.status === "PLANNED").length,
        failed: controls.filter((c) => c.status === "FAILED").length,
        notApplicable: controls.filter((c) => c.status === "NOT_APPLICABLE")
          .length,
      },
      riskSummary: {
        low: controls.filter((c) => c.risk === "LOW").length,
        medium: controls.filter((c) => c.risk === "MEDIUM").length,
        high: controls.filter((c) => c.risk === "HIGH").length,
        critical: controls.filter((c) => c.risk === "CRITICAL").length,
      },
      evaluatedAt: new Date().toISOString(),
    };
  }

  listFrameworks(): Array<{
    id: ComplianceFramework;
    label: string;
    description: string;
    score: number | null;
    controlCount: number;
  }> {
    const last = getComplianceState().lastAssessment;
    const scoreMap = new Map<ComplianceFramework, FrameworkScore>(
      last?.frameworkScores.map((f) => [f.framework, f]) ?? [],
    );

    // Ensure control counts even without assessment.
    const controls = complianceControlService.listControls();

    return COMPLIANCE_FRAMEWORKS.map((id) => {
      const meta = FRAMEWORK_META[id]!;
      const scored = scoreMap.get(id);
      const controlCount =
        scored?.controlCount ??
        controls.filter((c) => c.frameworks.includes(id)).length;
      return {
        id,
        label: meta.label,
        description: meta.description,
        score: scored?.score ?? null,
        controlCount,
      };
    });
  }

  listControls(filter?: {
    framework?: ComplianceFramework;
  }): ComplianceControl[] {
    return complianceControlService.listControls(filter);
  }

  async runAssessment(
    actorUserId?: string | null,
  ): Promise<ComplianceAssessmentResult> {
    return complianceAssessmentService.runAssessment(actorUserId);
  }

  private snapshotFromAssessment(
    assessment: ComplianceAssessmentResult,
  ): ComplianceStatusSnapshot {
    const controls = complianceControlService.listControls();
    return {
      overallScore: assessment.overallScore,
      frameworks: assessment.frameworkScores,
      evidenceCoveragePercent: assessment.evidenceCoverage.coveragePercent,
      lastAssessmentAt: assessment.assessedAt,
      controlCounts: {
        total: controls.length,
        implemented: controls.filter((c) => c.status === "IMPLEMENTED").length,
        partial: controls.filter((c) => c.status === "PARTIAL").length,
        planned: controls.filter((c) => c.status === "PLANNED").length,
        failed: controls.filter((c) => c.status === "FAILED").length,
        notApplicable: controls.filter((c) => c.status === "NOT_APPLICABLE")
          .length,
      },
      riskSummary: assessment.riskSummary,
      evaluatedAt: new Date().toISOString(),
    };
  }
}

export const complianceService = new ComplianceService();
