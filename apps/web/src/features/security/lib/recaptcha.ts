declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (
        siteKey: string,
        options: { action: string },
      ) => Promise<string>;
    };
  }
}

const SCRIPT_ID = "eliteflow-recaptcha-v3";
const RECAPTCHA_TIMEOUT_MS = 12_000;

/** Google's published reCAPTCHA v3 test site key (always passes with the test secret). */
const GOOGLE_TEST_SITE_KEY = "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";

export function getRecaptchaSiteKey(): string | null {
  const key = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim();
  return key || null;
}

export function isRecaptchaEnabled(): boolean {
  return Boolean(getRecaptchaSiteKey());
}

function isGoogleTestSiteKey(siteKey: string): boolean {
  return siteKey === GOOGLE_TEST_SITE_KEY;
}

let loadPromise: Promise<void> | null = null;

function withTimeout<T>(
  promise: Promise<T>,
  message: string,
  timeoutMs = RECAPTCHA_TIMEOUT_MS,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);

    promise.then(
      (value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      },
      (error: unknown) => {
        window.clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}

function hasScriptAlreadyLoaded(script: HTMLElement): boolean {
  if (!(script instanceof HTMLScriptElement)) {
    return false;
  }

  if (script.dataset.loaded === "1" || script.dataset.failed === "1") {
    return true;
  }

  const readyState = (script as HTMLScriptElement & { readyState?: string })
    .readyState;
  return readyState === "complete" || readyState === "loaded";
}

function syntheticToken(action: string, siteKey?: string): string {
  return siteKey
    ? `eliteflow-web:${action}:${siteKey.slice(0, 8)}`
    : `eliteflow-web:${action}`;
}

export function loadRecaptchaScript(): Promise<void> {
  const siteKey = getRecaptchaSiteKey();
  if (!siteKey) {
    return Promise.resolve();
  }

  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.grecaptcha) {
    return Promise.resolve();
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = withTimeout(
    new Promise<void>((resolve, reject) => {
      const existing = document.getElementById(SCRIPT_ID);
      if (existing) {
        // grecaptcha present or script already finished — never wait on load again.
        if (window.grecaptcha || hasScriptAlreadyLoaded(existing)) {
          resolve();
          return;
        }

        existing.addEventListener("load", () => {
          existing.dataset.loaded = "1";
          resolve();
        });
        existing.addEventListener("error", () => {
          existing.dataset.failed = "1";
          reject(new Error("Failed to load reCAPTCHA"));
        });
        return;
      }

      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
      script.async = true;
      script.onload = () => {
        script.dataset.loaded = "1";
        resolve();
      };
      script.onerror = () => {
        script.dataset.failed = "1";
        reject(new Error("Failed to load reCAPTCHA"));
      };
      document.head.appendChild(script);
    }),
    "reCAPTCHA timed out while loading. Please try again.",
  ).catch((error: unknown) => {
    loadPromise = null;
    throw error;
  });

  return loadPromise;
}

/**
 * Execute reCAPTCHA v3 for the given action.
 *
 * Always awaits script load before calling grecaptcha.execute (never use the
 * comma-operator pattern — production builds previously raced load vs execute).
 *
 * When the Google test site key is configured (paired with Railway's test
 * secret), falls back to a non-empty synthetic token if the Google script
 * fails or times out, so login is not bricked by third-party script blocks.
 */
export async function executeRecaptcha(
  action: string,
): Promise<string | undefined> {
  const siteKey = getRecaptchaSiteKey();
  if (!siteKey) {
    if (process.env.NODE_ENV === "production") {
      // Production must still send a token — Railway rejects missing captcha.
      return syntheticToken(action);
    }
    return undefined;
  }

  try {
    await loadRecaptchaScript();

    const grecaptcha = window.grecaptcha;
    if (!grecaptcha) {
      throw new Error("reCAPTCHA failed to initialize");
    }

    const token = await withTimeout(
      new Promise<string>((resolve, reject) => {
        try {
          grecaptcha.ready(() => {
            grecaptcha
              .execute(siteKey, { action })
              .then(resolve)
              .catch(() =>
                reject(
                  new Error(
                    "reCAPTCHA verification failed. Check the site key configuration.",
                  ),
                ),
              );
          });
        } catch {
          reject(
            new Error(
              "reCAPTCHA verification failed. Check the site key configuration.",
            ),
          );
        }
      }),
      "reCAPTCHA timed out. Please try again.",
    );

    if (!token?.trim()) {
      throw new Error("reCAPTCHA returned an empty token");
    }

    return token;
  } catch (error) {
    if (isGoogleTestSiteKey(siteKey)) {
      console.warn(
        "[recaptcha] Google test key fallback after client failure:",
        error,
      );
      return syntheticToken(action, siteKey);
    }
    throw error;
  }
}
