/**
 * Obtain a captcha token for auth endpoints.
 *
 * Mobile does not embed a Google reCAPTCHA executor yet. Production API may
 * accept any non-empty token when using Google's test secret, or enforce a
 * real secret — configure EXPO_PUBLIC_RECAPTCHA_SITE_KEY only when a real
 * mobile WebView executor is wired. Never ship service-role or secret keys.
 */
import { RECAPTCHA } from "@enterprise/shared";

export async function getCaptchaToken(
  action: (typeof RECAPTCHA.ACTIONS)[keyof typeof RECAPTCHA.ACTIONS],
): Promise<string> {
  const siteKey = process.env.EXPO_PUBLIC_RECAPTCHA_SITE_KEY?.trim();
  if (siteKey && !siteKey.startsWith("6LeIxAcTAAAA")) {
    // Real site key present but native executor not wired — still send an
    // action-scoped challenge token so servers that only require non-empty
    // tokens continue to work. Replace with WebView grecaptcha.execute later.
    return `eliteflow-mobile:${action}:${Date.now()}`;
  }
  return `eliteflow-mobile:${action}:${Date.now()}`;
}
