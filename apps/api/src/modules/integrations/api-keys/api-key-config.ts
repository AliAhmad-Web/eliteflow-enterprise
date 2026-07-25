/**
 * Phase 19.3 — API-key based integration providers (non-OAuth).
 */

export type ApiKeySlug =
  | "gemini"
  | "openai"
  | "stripe"
  | "cloudinary"
  | "supabase"
  | "resend";

export const API_KEY_SLUGS: readonly ApiKeySlug[] = [
  "gemini",
  "openai",
  "stripe",
  "cloudinary",
  "supabase",
  "resend",
] as const;

export const API_KEY_CREDENTIAL = "api_key" as const;

export const API_VERSIONS: Record<ApiKeySlug, string> = {
  gemini: "generativelanguage.v1beta",
  openai: "openai.v1",
  stripe: "stripe.v1",
  cloudinary: "cloudinary.v1_1",
  supabase: "supabase.v1",
  resend: "resend.v1",
};

export function isApiKeySlug(slug: string): slug is ApiKeySlug {
  return (API_KEY_SLUGS as readonly string[]).includes(slug);
}

export interface ApiUsageSnapshot {
  requestsToday: number;
  monthlyRequests: number;
  remainingQuota: number | null;
  rateLimitPerMinute: number | null;
  averageResponseMs: number | null;
  updatedAt: string;
}

export function emptyUsageSnapshot(): ApiUsageSnapshot {
  return {
    requestsToday: 0,
    monthlyRequests: 0,
    remainingQuota: null,
    rateLimitPerMinute: null,
    averageResponseMs: null,
    updatedAt: new Date().toISOString(),
  };
}
