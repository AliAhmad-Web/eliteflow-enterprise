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

export function getRecaptchaSiteKey(): string | null {
  const key = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim();
  return key || null;
}

export function isRecaptchaEnabled(): boolean {
  return Boolean(getRecaptchaSiteKey());
}

let loadPromise: Promise<void> | null = null;

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

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load reCAPTCHA")),
      );
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load reCAPTCHA"));
    document.head.appendChild(script);
  });

  return loadPromise;
}

/**
 * Execute reCAPTCHA v3 for the given action.
 * Returns undefined when site key is not configured (dev bypass).
 * In production, missing site key throws a clear configuration error.
 */
export async function executeRecaptcha(
  action: string,
): Promise<string | undefined> {
  const siteKey = getRecaptchaSiteKey();
  if (!siteKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "reCAPTCHA is not configured. Set NEXT_PUBLIC_RECAPTCHA_SITE_KEY.",
      );
    }
    return undefined;
  }

  await loadRecaptchaScript();

  return new Promise((resolve, reject) => {
    if (!window.grecaptcha) {
      reject(new Error("reCAPTCHA failed to initialize"));
      return;
    }

    window.grecaptcha.ready(() => {
      window.grecaptcha!
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
  });
}
