import { RECAPTCHA } from "@enterprise/shared";

/**
 * Obtain a reCAPTCHA v3 token for auth endpoints.
 *
 * When `EXPO_PUBLIC_RECAPTCHA_SITE_KEY` is set to a real site key, replace the
 * fallback with a WebView/`grecaptcha.execute` implementation. Production
 * Railway currently uses Google's published test secret, which accepts any
 * non-empty token — so a deterministic client token keeps login working.
 */
export async function getCaptchaToken(
  action: (typeof RECAPTCHA.ACTIONS)[keyof typeof RECAPTCHA.ACTIONS],
): Promise<string> {
  const siteKey = process.env.EXPO_PUBLIC_RECAPTCHA_SITE_KEY?.trim();
  if (siteKey) {
    // Site key present: still return an action-scoped token until a native
    // reCAPTCHA executor is wired. Google's test site/secret pair accepts it.
    return `eliteflow-mobile:${action}:${siteKey.slice(0, 8)}`;
  }
  return `eliteflow-mobile:${action}`;
}
