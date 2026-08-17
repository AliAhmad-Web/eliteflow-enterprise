/**
 * Non-secret startup connectivity report for Core/P0/P1 integrations.
 * Never logs credential values — only configured / missing / placeholder.
 */

import {
  classifyEmailFromDomain,
  classifyFrontendHost,
  classifySmtpHost,
  getEmailTransportLabel,
  isEmailConfigured,
  isSmtpConfigured,
  warnIfTestSmtpOnLiveHost,
} from "../../config/email.config.js";
import {
  getSupabaseServiceRoleStatus,
  isSupabaseStorageReady,
  supabaseConfig,
} from "../../config/supabase.config.js";
import {
  getGoogleOAuthConfig,
  getGitHubOAuthConfig,
} from "../../modules/integrations/oauth/oauth-config.js";
import { getAntivirusConfig } from "../../modules/files/antivirus/antivirus.config.js";
import {
  getActiveStorageProviderName,
  verifySupabaseStorageAccess,
} from "../../modules/files/storage/storage.provider.js";
import {
  getRateLimitRedisUrl,
  isRateLimitEnabled,
  isRateLimitFailOpen,
} from "./rate-limit/rate-limit.config.js";

function hasNonEmpty(name: string): boolean {
  const v = process.env[name]?.trim();
  return Boolean(v && v.length > 0);
}

export function reportCoreConnectivity(): void {
  const storageMode = (process.env.STORAGE_PROVIDER ?? "local")
    .trim()
    .toLowerCase();
  const role = getSupabaseServiceRoleStatus();
  const storageReady = isSupabaseStorageReady();

  const redisConfigured = Boolean(getRateLimitRedisUrl());
  const google = getGoogleOAuthConfig();
  const github = getGitHubOAuthConfig();
  const av = getAntivirusConfig();
  const emailTransport = getEmailTransportLabel();
  warnIfTestSmtpOnLiveHost();

  console.log("[connectivity] Core external integration status (no secrets):");
  console.log(
    `[connectivity] supabase.url=${hasNonEmpty("SUPABASE_URL") ? "ok" : "missing"} ` +
      `jwks=${hasNonEmpty("SUPABASE_JWKS_URL") ? "ok" : "missing"} ` +
      `serviceRole=${role} admin=${storageReady ? "ready" : "unavailable"}`,
  );
  console.log(
    `[connectivity] storage.mode=${storageMode || "local"} ` +
      `active=${getActiveStorageProviderName()} ` +
      `bucket=${supabaseConfig.storageBucket} ` +
      `supabaseReady=${storageReady ? "yes" : "no"}`,
  );
  console.log(
    `[connectivity] redis=${redisConfigured ? "configured" : "missing"} ` +
      `rateLimit=${isRateLimitEnabled() ? "on" : "off"} ` +
      `failOpen=${isRateLimitFailOpen()}`,
  );
  console.log(
    `[connectivity] email=${isEmailConfigured() ? emailTransport : "none"} ` +
      `smtpHost=${classifySmtpHost()} smtpUsable=${isSmtpConfigured() ? "yes" : "no"} ` +
      `emailFrom=${classifyEmailFromDomain()} frontendHost=${classifyFrontendHost()} ` +
      `resend=${hasNonEmpty("RESEND_API_KEY") ? "ok" : "missing"} ` +
      `gmailRefresh=${hasNonEmpty("GMAIL_OAUTH_REFRESH_TOKEN") ? "ok" : "missing"}`,
  );
  console.log(
    `[connectivity] recaptcha=${hasNonEmpty("RECAPTCHA_SECRET_KEY") ? "ok" : "missing"} ` +
      `integrations.google=${google.configured ? "ok" : "missing"} ` +
      `integrations.github=${github.configured ? "ok" : "missing"} ` +
      `oauthStateConfigured=${hasNonEmpty("INTEGRATIONS_OAUTH_STATE_SECRET") ? "yes" : "no"} ` +
      `settingsEncryptionConfigured=${hasNonEmpty("SETTINGS_ENCRYPTION_KEY") ? "yes" : "no"}`,
  );
  console.log(
    `[connectivity] antivirus.enabled=${av.enabled} provider=${av.provider} ` +
      `failClosed=${av.failClosed}`,
  );
  console.log(
    `[connectivity] urls.cors=${hasNonEmpty("CORS_ORIGIN") ? "ok" : "missing"} ` +
      `frontend=${hasNonEmpty("FRONTEND_URL") ? "ok" : "missing"} ` +
      `app=${hasNonEmpty("APP_URL") ? "ok" : "missing"} ` +
      `apiPublic=${hasNonEmpty("API_PUBLIC_URL") ? "ok" : "missing"} ` +
      `webApp=${hasNonEmpty("WEB_APP_URL") ? "ok" : "missing"}`,
  );

  if (role !== "ok") {
    console.warn(
      "[connectivity] SUPABASE_SERVICE_ROLE_KEY is missing or a placeholder — " +
        "set the real service_role (or sb_secret) from Supabase Dashboard → Settings → API. " +
        "Do not put it in NEXT_PUBLIC_* variables.",
    );
  }
  if (storageMode === "supabase" && role !== "ok") {
    console.warn(
      "[connectivity] STORAGE_PROVIDER=supabase requested but service role is unusable — falling back to local storage.",
    );
  }
  if (!redisConfigured && isRateLimitEnabled()) {
    console.warn(
      "[connectivity] Redis URL not set — rate limiter and shared stores use fail-open/memory fallbacks. " +
        "Set REDIS_URL or RATE_LIMIT_REDIS_URL for production multi-instance.",
    );
  }
  if (!hasNonEmpty("RECAPTCHA_SECRET_KEY")) {
    console.warn(
      "[connectivity] RECAPTCHA_SECRET_KEY unset — captcha is skipped in non-production; required for production auth.",
    );
  }
}

/**
 * Async bucket probe when Admin credentials exist. Safe to call after listen().
 * Skipped (no network) when service role is missing/placeholder.
 */
export async function reportSupabaseStorageProbe(): Promise<void> {
  if (!isSupabaseStorageReady()) {
    console.log(
      "[connectivity] supabase.storage.probe=skipped (admin credentials unavailable)",
    );
    return;
  }

  const result = await verifySupabaseStorageAccess();
  console.log(
    `[connectivity] supabase.storage.probe=${result.ok ? "ok" : "fail"} ` +
      `reason=${result.reason}`,
  );
}
