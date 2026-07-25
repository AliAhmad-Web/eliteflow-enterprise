import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  assertSupabaseConfig,
  supabaseConfig,
} from "../../config/supabase.config.js";

let adminClient: SupabaseClient | null = null;

/**
 * Service-role client used only on the API to verify Supabase Auth JWTs.
 * Never expose this client or the service role key to the browser.
 */
export function getSupabaseAdminClient(): SupabaseClient {
  assertSupabaseConfig();

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
