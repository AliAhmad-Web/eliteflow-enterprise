export { zeroTrustService, ZERO_TRUST_ERROR_CODES } from "./zero-trust.service.js";
export { evaluateZeroTrust } from "./zero-trust.middleware.js";
export {
  ZERO_TRUST_RISK_POLICIES,
  resolvePathClassification,
} from "./zero-trust.policies.js";
export {
  markStepUpVerified,
  hasValidStepUp,
  getStepUpStatus,
  clearStepUp,
} from "./zero-trust.step-up.js";
export type {
  RequestTrustResult,
  ResourceTrustResult,
  SessionTrustResult,
  ZeroTrustDecision,
  ZeroTrustRiskLevel,
  ZeroTrustPolicyDto,
  ZeroTrustStatusDto,
} from "./zero-trust.types.js";
