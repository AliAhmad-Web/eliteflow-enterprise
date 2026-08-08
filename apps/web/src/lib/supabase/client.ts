import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { OAuthProvider, type OAuthProvider as OAuthProviderType } from "@enterprise/shared";

let browserClient: SupabaseClient | null = null;

export function isSupabaseBrowserConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function getSupabaseBrowserClient(): SupabaseClient {
  if (!isSupabaseBrowserConfigured()) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set",
    );
  }

  if (!browserClient) {
    browserClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          // PKCE returns ?code= (query) which survives Next.js better than
          // implicit #access_token hashes that get stripped during hydration.
          flowType: "pkce",
        },
      },
    );
  }

  return browserClient;
}

const PROVIDER_TO_SUPABASE: Record<OAuthProviderType, "google" | "github"> = {
  [OAuthProvider.GOOGLE]: "google",
  [OAuthProvider.GITHUB]: "github",
};

export function toSupabaseProvider(
  provider: OAuthProviderType,
): "google" | "github" {
  return PROVIDER_TO_SUPABASE[provider];
}

function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/$/, "");
}

/**
 * OAuth `redirectTo` must be allow-listed in Supabase Auth → URL Configuration.
 * Uses the live browser origin so production never sends users to localhost
 * after Google/GitHub sign-in (Site URL must also be the production host).
 */
export function getOAuthCallbackUrl(_provider?: OAuthProviderType): string {
  let origin: string;

  if (typeof window !== "undefined") {
    origin = normalizeOrigin(window.location.origin);
  } else {
    const configured = process.env.NEXT_PUBLIC_APP_URL
      ? normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL)
      : "";
    if (configured) {
      origin = configured;
    } else if (process.env.NODE_ENV === "production") {
      throw new Error(
        "NEXT_PUBLIC_APP_URL must be set in production for OAuth callbacks.",
      );
    } else {
      origin = "http://localhost:3000";
    }
  }

  // Keep the redirect URL stable (no query string). Provider/intent live in
  // sessionStorage so Supabase allow-list matching stays reliable.
  return `${origin}/auth/callback`;
}
