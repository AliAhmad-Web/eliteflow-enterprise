import type {
  ComplianceAssessmentResult,
  ComplianceControlStatus,
  ComplianceEvidenceItem,
} from "./compliance.types.js";

interface ControlOverride {
  status: ComplianceControlStatus;
  reason: string;
  updatedAt: string;
  actorUserId: string | null;
}

interface ComplianceRuntimeState {
  overrides: Map<string, ControlOverride>;
  lastAssessment: ComplianceAssessmentResult | null;
  lastEvidence: ComplianceEvidenceItem[];
  lastEvidenceAt: string | null;
}

const state: ComplianceRuntimeState = {
  overrides: new Map(),
  lastAssessment: null,
  lastEvidence: [],
  lastEvidenceAt: null,
};

export function getComplianceState(): ComplianceRuntimeState {
  return state;
}

export function setControlOverride(
  controlId: string,
  status: ComplianceControlStatus,
  reason: string,
  actorUserId: string | null,
): void {
  state.overrides.set(controlId, {
    status,
    reason,
    updatedAt: new Date().toISOString(),
    actorUserId,
  });
}

export function clearControlOverride(controlId: string): void {
  state.overrides.delete(controlId);
}

export function getControlOverride(
  controlId: string,
): ControlOverride | undefined {
  return state.overrides.get(controlId);
}

export function setLastAssessment(result: ComplianceAssessmentResult): void {
  state.lastAssessment = result;
}

export function setLastEvidence(items: ComplianceEvidenceItem[]): void {
  state.lastEvidence = items;
  state.lastEvidenceAt = new Date().toISOString();
}
