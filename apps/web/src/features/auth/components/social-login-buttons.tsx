"use client";

import { OAuthProvider, type OAuthProvider as OAuthProviderType } from "@enterprise/shared";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  getOAuthCallbackUrl,
  getSupabaseBrowserClient,
  isSupabaseBrowserConfigured,
  toSupabaseProvider,
} from "@/lib/supabase/client";

import { OAUTH_INTENT_STORAGE_KEY, OAUTH_PROVIDER_STORAGE_KEY } from "../constants/oauth";
import type { OAuthFlowIntent } from "../constants/oauth";
import { AuthAlert } from "./auth-alert";

interface SocialLoginButtonsProps {
  mode?: "login" | "signup";
}

export function SocialLoginButtons({ mode = "login" }: SocialLoginButtonsProps) {
  const [loadingProvider, setLoadingProvider] = useState<OAuthProviderType | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  if (!isSupabaseBrowserConfigured()) {
    return null;
  }

  const startOAuth = async (provider: OAuthProviderType) => {
    setError(null);
    setLoadingProvider(provider);

    try {
      const supabase = getSupabaseBrowserClient();
      const intent: OAuthFlowIntent = mode === "signup" ? "signup" : "login";
      sessionStorage.setItem(OAUTH_PROVIDER_STORAGE_KEY, provider);
      sessionStorage.setItem(OAUTH_INTENT_STORAGE_KEY, intent);

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: toSupabaseProvider(provider),
        options: {
          redirectTo: getOAuthCallbackUrl(provider),
          queryParams:
            provider === OAuthProvider.GOOGLE
              ? { access_type: "offline", prompt: "consent" }
              : undefined,
        },
      });

      if (oauthError) {
        sessionStorage.removeItem(OAUTH_PROVIDER_STORAGE_KEY);
        sessionStorage.removeItem(OAUTH_INTENT_STORAGE_KEY);
        setError(oauthError.message);
        setLoadingProvider(null);
      }
    } catch {
      sessionStorage.removeItem(OAUTH_PROVIDER_STORAGE_KEY);
      sessionStorage.removeItem(OAUTH_INTENT_STORAGE_KEY);
      setError("Unable to start OAuth sign-in. Please try again.");
      setLoadingProvider(null);
    }
  };

  return (
    <div className="space-y-3">
      {error ? (
        <AuthAlert variant="error" title="OAuth failed" description={error} />
      ) : null}

      <div className="relative py-1">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          isLoading={loadingProvider === OAuthProvider.GOOGLE}
          disabled={loadingProvider !== null}
          onClick={() => void startOAuth(OAuthProvider.GOOGLE)}
        >
          {loadingProvider === OAuthProvider.GOOGLE
            ? "Connecting…"
            : "Continue with Google"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          isLoading={loadingProvider === OAuthProvider.GITHUB}
          disabled={loadingProvider !== null}
          onClick={() => void startOAuth(OAuthProvider.GITHUB)}
        >
          {loadingProvider === OAuthProvider.GITHUB
            ? "Connecting…"
            : "Continue with GitHub"}
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {mode === "signup"
          ? "Social sign-up creates a client account with a verified email."
          : "Use a linked Google or GitHub account to sign in securely."}
      </p>
    </div>
  );
}
