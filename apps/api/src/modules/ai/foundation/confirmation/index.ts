/**
 * Human Confirmation Engine — public exports.
 */

export {
  isAiConfirmationEnabled,
  getAiConfirmationExpirationMinutes,
  isAiConfirmationHighRiskOnly,
} from "./confirmation.config.js";
export {
  PROTECTED_ACTION_CATALOG,
  getProtectedActionByToolId,
  getProtectedActionByKey,
} from "./confirmation.catalog.js";
export {
  humanConfirmationService,
  ConfirmationEngineError,
  hashConfirmationArguments,
} from "./human-confirmation.service.js";
export type { ConfirmationFailureReason } from "./human-confirmation.service.js";
export type {
  ConfirmationRiskLevel,
  ConfirmationStatus,
  ConfirmationRequiredPayload,
  CreateConfirmationInput,
  ApproveConfirmationInput,
  HumanConfirmationRecord,
  ProtectedActionDefinition,
} from "./confirmation.types.js";
export { CONFIRMATION_RISK_LEVELS } from "./confirmation.types.js";
