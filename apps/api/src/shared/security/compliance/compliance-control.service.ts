import { writeAuditLogSafe } from "../write-audit-log.js";
import {
  collectAllEvidence,
  probeEvidenceSource,
  residualRisk,
  statusFromEvidence,
} from "./compliance.evidence.js";
import { COMPLIANCE_CONTROL_REGISTRY } from "./compliance.registry.js";
import {
  getControlOverride,
  setControlOverride,
  setLastEvidence,
} from "./compliance.state.js";
import type {
  ComplianceControl,
  ComplianceControlStatus,
  ComplianceEvidenceItem,
  ComplianceFramework,
} from "./compliance.types.js";

const AUDIT_RESOURCE = "compliance";

/**
 * Control registry and status resolution with auto-evidence.
 */
class ComplianceControlService {
  listDefinitions() {
    return COMPLIANCE_CONTROL_REGISTRY;
  }

  /**
   * Resolve live control rows. One row per control definition,
   * tagged with primary framework + full framework list.
   */
  listControls(filter?: {
    framework?: ComplianceFramework;
  }): ComplianceControl[] {
    const evidenceBySource = new Map(
      collectAllEvidence().map((e) => [e.source, e] as const),
    );
    setLastEvidence([...evidenceBySource.values()]);

    const verifiedAt = new Date().toISOString();
    const controls: ComplianceControl[] = [];

    for (const def of COMPLIANCE_CONTROL_REGISTRY) {
      const override = getControlOverride(def.id);
      const auto = statusFromEvidence(def.evidenceSources);
      const status = override?.status ?? auto.status;
      const evidence: ComplianceEvidenceItem[] = def.evidenceSources.map(
        (source) => {
          const cached = evidenceBySource.get(source);
          if (cached) return cached;
          const probe = probeEvidenceSource(source);
          return {
            source,
            label: source,
            present: probe.present,
            detail: probe.detail,
            collectedAt: verifiedAt,
          };
        },
      );

      const primaryFramework = def.frameworks[0]!;
      const row: ComplianceControl = {
        id: def.id,
        title: def.title,
        description: def.description,
        framework: primaryFramework,
        frameworks: [...def.frameworks],
        category: def.category,
        status,
        owner: def.owner,
        evidence,
        risk: residualRisk(def.inherentRisk, status),
        lastVerification: verifiedAt,
        manualOverride: Boolean(override),
        overrideReason: override?.reason ?? null,
      };

      if (filter?.framework && !def.frameworks.includes(filter.framework)) {
        continue;
      }
      controls.push(row);
    }

    return controls;
  }

  overrideControl(input: {
    controlId: string;
    status: ComplianceControlStatus;
    reason: string;
    actorUserId?: string | null;
  }): ComplianceControl | null {
    const def = COMPLIANCE_CONTROL_REGISTRY.find(
      (c) => c.id === input.controlId,
    );
    if (!def) return null;

    setControlOverride(
      input.controlId,
      input.status,
      input.reason,
      input.actorUserId ?? null,
    );

    void writeAuditLogSafe(
      {
        userId: input.actorUserId ?? null,
        action: "compliance.control_override",
        resource: AUDIT_RESOURCE,
        metadata: {
          controlId: input.controlId,
          status: input.status,
          reason: input.reason,
        },
      },
      "compliance",
    );

    return (
      this.listControls().find((c) => c.id === input.controlId) ?? null
    );
  }
}

export const complianceControlService = new ComplianceControlService();
