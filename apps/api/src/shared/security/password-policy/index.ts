export {
  passwordPolicyService,
  PasswordPolicyService,
} from "./password-policy.service.js";
export { enforceForcedPasswordChange } from "./password-policy.middleware.js";
export {
  PASSWORD_CHANGE_REASONS,
  PASSWORD_CHANGE_REQUIRED_MESSAGE,
  PASSWORD_POLICY_AUDIT_ACTIONS,
  PASSWORD_POLICY_AUDIT_RESOURCE,
  type PasswordChangeReason,
} from "./password-policy.constants.js";
export type {
  AllowedEndpointRule,
  EnforcePasswordChangeContext,
  PasswordChangeDecision,
  PasswordPolicyConfig,
  PasswordPolicyUserSnapshot,
} from "./password-policy.types.js";
