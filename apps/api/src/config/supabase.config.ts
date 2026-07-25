export const supabaseConfig = {
  url: process.env.SUPABASE_URL ?? "",
  /** Legacy service_role JWT or new `sb_secret_…` API key */
  serviceRoleKey:
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    "",
  jwksUrl: process.env.SUPABASE_JWKS_URL ?? "",
  /** Legacy HS256 JWT secret from Supabase project settings (optional fallback). */
  jwtSecret: process.env.SUPABASE_JWT_SECRET ?? "",
} as const;

export function isSupabaseConfigured(): boolean {
  return (
    supabaseConfig.url.length > 0 &&
    supabaseConfig.serviceRoleKey.length > 0
  );
}

export function assertSupabaseConfig(): void {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) must be set for OAuth",
    );
  }
}
