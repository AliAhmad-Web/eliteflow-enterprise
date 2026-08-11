function cleanEnv(value: string | undefined): string {
  if (!value) return "";
  // Strip UTF-8 BOM / zero-width chars that PowerShell/UTF-8 uploads sometimes prepend.
  return value.replace(/^\uFEFF/, "").trim();
}

export const supabaseConfig = {
  url: cleanEnv(process.env.SUPABASE_URL),
  /** Legacy service_role JWT or new `sb_secret_…` API key (server-only). */
  serviceRoleKey: cleanEnv(
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY,
  ),
  jwksUrl: cleanEnv(process.env.SUPABASE_JWKS_URL),
  /** Legacy HS256 JWT secret from Supabase project settings (optional fallback). */
  jwtSecret: cleanEnv(process.env.SUPABASE_JWT_SECRET),
  /** File Manager storage bucket (default matches File Manager implementation). */
  storageBucket: cleanEnv(process.env.SUPABASE_STORAGE_BUCKET) || "files",
} as const;

export type SupabaseServiceRoleStatus = "ok" | "missing" | "placeholder";

/** Detect .env placeholders so we skip Auth Admin / Storage Admin. */
export function isUsableSupabaseServiceRoleKey(key: string): boolean {
  const trimmed = key.trim();
  if (trimmed.length < 40) return false;
  if (
    /your[-_\s]?service|changeme|replace|xxx|placeholder|example|todo/i.test(
      trimmed,
    )
  ) {
    return false;
  }
  return true;
}

/** Non-secret classification of the configured service-role credential. */
export function getSupabaseServiceRoleStatus(): SupabaseServiceRoleStatus {
  const key = supabaseConfig.serviceRoleKey.trim();
  if (!key) return "missing";
  if (!isUsableSupabaseServiceRoleKey(key)) return "placeholder";
  return "ok";
}

/**
 * True when server-side Supabase Admin (Auth getUser / Storage) can be used.
 * Never treat JWKS-only as Admin-capable.
 */
export function isSupabaseAdminConfigured(): boolean {
  return (
    supabaseConfig.url.trim().length > 0 &&
    getSupabaseServiceRoleStatus() === "ok"
  );
}

/** OAuth may use Admin OR JWKS / JWT secret fallback. */
export function isSupabaseConfigured(): boolean {
  return (
    supabaseConfig.url.trim().length > 0 &&
    (isSupabaseAdminConfigured() ||
      Boolean(supabaseConfig.jwksUrl.trim()) ||
      Boolean(supabaseConfig.jwtSecret.trim()))
  );
}

export function assertSupabaseConfig(): void {
  if (!supabaseConfig.url.trim()) {
    throw new Error("SUPABASE_URL must be set for OAuth");
  }
  if (
    !isSupabaseAdminConfigured() &&
    !supabaseConfig.jwksUrl.trim() &&
    !supabaseConfig.jwtSecret.trim()
  ) {
    throw new Error(
      "OAuth requires a real SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY), or SUPABASE_JWKS_URL / SUPABASE_JWT_SECRET for local JWT verification",
    );
  }
}

export function assertSupabaseAdminConfig(): void {
  if (!supabaseConfig.url.trim()) {
    throw new Error("SUPABASE_URL must be set for Supabase Admin");
  }
  const status = getSupabaseServiceRoleStatus();
  if (status === "missing") {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) must be set for Supabase Admin / Storage",
    );
  }
  if (status === "placeholder") {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is a placeholder — set the real service_role (or sb_secret) from Supabase Dashboard → Settings → API",
    );
  }
}

/** True when File Manager can use Supabase Storage with a usable Admin key. */
export function isSupabaseStorageReady(): boolean {
  return isSupabaseAdminConfigured();
}
