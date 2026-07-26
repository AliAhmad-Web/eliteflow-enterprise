import { RECAPTCHA } from "@enterprise/shared";

/**
 * Obtain a reCAPTCHA v3 token for auth endpoints.
 * Mirrors mobile: Railway currently accepts a non-empty deterministic token
 * when using Google's test secret. No site key is shipped in the extension.
 */
export async function getCaptchaToken(
  action: (typeof RECAPTCHA.ACTIONS)[keyof typeof RECAPTCHA.ACTIONS],
): Promise<string> {
  return `eliteflow-extension:${action}`;
}
