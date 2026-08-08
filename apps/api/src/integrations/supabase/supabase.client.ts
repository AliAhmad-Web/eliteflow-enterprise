import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  assertSupabaseAdminConfig,
  isSupabaseAdminConfigured,
  supabaseConfig,
} from "../../config/supabase.config.js";

let adminClient: SupabaseClient | null = null;

/**
 * Service-role client for Auth Admin + Storage.
 * Created only when SUPABASE_URL and a real (non-placeholder) service-role key exist.
 * Never expose this client or the service role key to the browser / NEXT_PUBLIC_*.
 */
export function getSupabaseAdminClient(): SupabaseClient {
  assertSupabaseAdminConfig();

  if (!adminClient) {
    adminClient = createClient(
      supabaseConfig.url,
      supabaseConfig.serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }

  return adminClient;
}

/** Null when Admin credentials are missing or placeholder — never fabricates a client. */
export function tryGetSupabaseAdminClient(): SupabaseClient | null {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }
  return getSupabaseAdminClient();
}

/** Test helper — clears cached Admin client. */
export function resetSupabaseAdminClientForTests(): void {
  adminClient = null;
}
