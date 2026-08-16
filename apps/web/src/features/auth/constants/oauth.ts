export const OAUTH_PROVIDER_STORAGE_KEY = "eliteflow.oauth.provider";
export const OAUTH_INTENT_STORAGE_KEY = "eliteflow.oauth.intent";
export const OAUTH_SIGNUP_ERROR_STORAGE_KEY = "eliteflow.oauth.signupError";
export const OAUTH_ACCOUNT_REQUIRED_STORAGE_KEY =
  "eliteflow.oauth.accountRequired";
export const OAUTH_OTP_SESSION_STORAGE_KEY = "eliteflow.oauth.otpSessionId";
export const OAUTH_MFA_METHOD_STORAGE_KEY = "eliteflow.oauth.mfaMethod";

export type OAuthFlowIntent = "login" | "signup";
