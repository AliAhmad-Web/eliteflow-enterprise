/**
 * Pure header builders for Next.js config (no React).
 * Flagged via NEXT_PUBLIC_SECURITY_* — default OFF returns empty.
 */

function parseEnvFlag(value: string | undefined, defaultValue = false): boolean {
  if (value === undefined) return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (normalized.length === 0) return defaultValue;
  switch (normalized) {
    case "1":
    case "true":
    case "yes":
    case "on":
      return true;
    case "0":
    case "false":
    case "no":
    case "off":
      return false;
    default:
      return defaultValue;
  }
}

function isHeadersEnabled(): boolean {
  return (
    parseEnvFlag(process.env.NEXT_PUBLIC_SECURITY_HEADERS, false) ||
    parseEnvFlag(process.env.NEXT_PUBLIC_SECURITY_HTTP_HEADERS, false)
  );
}

function isCspEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_SECURITY_CSP, false);
}

/** Allow mic when Phase 7 voice STT is active (defaults OFF — Voice AI hidden until re-enabled). */
function isMicrophonePolicyAllowed(): boolean {
  return (
    parseEnvFlag(process.env.NEXT_PUBLIC_COMMUNICATION_VOICE_AI, false) ||
    parseEnvFlag(process.env.NEXT_PUBLIC_COMMUNICATION_SPEECH_TO_TEXT, false) ||
    parseEnvFlag(process.env.NEXT_PUBLIC_COMMUNICATION_SPEECH_UI, false)
  );
}

export type SecurityHeaderTuple = { key: string; value: string };

/** Enterprise headers when SECURITY_HEADERS is ON. */
export function buildSecurityHttpHeaders(): SecurityHeaderTuple[] {
  if (!isHeadersEnabled()) {
    return [];
  }

  const microphone = isMicrophonePolicyAllowed() ? "(self)" : "()";

  return [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Frame-Options", value: "DENY" },
    {
      key: "Permissions-Policy",
      value: `camera=(), microphone=${microphone}, geolocation=(), payment=(), usb=(), interest-cohort=()`,
    },
    { key: "X-DNS-Prefetch-Control", value: "off" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ];
}

/**
 * Report-Only CSP when SECURITY_CSP is ON (Phase 1 architecture: report-only first).
 * Permissive enough for Next.js + reCAPTCHA + API/Supabase connections.
 */
export function buildSecurityCspReportOnlyHeader(): SecurityHeaderTuple | null {
  if (!isCspEnabled()) {
    return null;
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  const connectExtra = apiUrl ? ` ${apiUrl}` : "";

  const policy = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    // Next.js + hydration often need inline/eval in webpack mode; report-only first.
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.gstatic.com https://www.recaptcha.net",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self' https: http://localhost:* http://127.0.0.1:*${connectExtra}`,
    "frame-src 'self' https://www.google.com https://www.recaptcha.net",
    "worker-src 'self' blob:",
  ].join("; ");

  return {
    key: "Content-Security-Policy-Report-Only",
    value: policy,
  };
}

export function buildAllSecurityResponseHeaders(): SecurityHeaderTuple[] {
  const headers = buildSecurityHttpHeaders();
  const csp = buildSecurityCspReportOnlyHeader();
  if (csp) headers.push(csp);
  return headers;
}
