export const API_KEY_SLUGS = [
  "gemini",
  "openai",
  "stripe",
  "cloudinary",
  "supabase",
  "resend",
] as const;

export type ApiKeySlug = (typeof API_KEY_SLUGS)[number];

export function isApiKeySlug(slug: string): slug is ApiKeySlug {
  return (API_KEY_SLUGS as readonly string[]).includes(slug);
}

export function apiKeySecretHint(slug: string): string {
  switch (slug) {
    case "gemini":
      return "Paste your Gemini API key from Google AI Studio. Used as the primary AI provider.";
    case "openai":
      return "Paste your OpenAI API key. Available as a future provider switch in Settings.";
    case "stripe":
      return "Paste a Stripe secret key (sk_…). Architecture only — no live charges in Phase 19.3.";
    case "cloudinary":
      return "Use cloud_name:api_key:api_secret for File Manager media uploads.";
    case "resend":
      return "Paste your Resend API key for transactional, OTP, invoice, and notification emails.";
    case "supabase":
      return "Leave blank to verify the existing Supabase env stack, or provide url|service_role_key.";
    default:
      return "Paste the provider API credential. Secrets are encrypted and never returned.";
  }
}
