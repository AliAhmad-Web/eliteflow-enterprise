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
          // Browser SPA OAuth uses the implicit grant by default. Forcing PKCE
          // without SSR cookie storage breaks the callback (missing code verifier).
          flowType: "implicit",
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

export function getOAuthCallbackUrl(_provider?: OAuthProviderType): string {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Keep the redirect URL stable (no query string). Provider/intent live in
  // sessionStorage so Supabase allow-list matching stays reliable.
  return `${origin}/auth/callback`;
}
