"use client";

import {
  AUTH_ERROR_CODES,
  OAuthProvider,
  type OAuthProvider as OAuthProviderType,
} from "@enterprise/shared";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { LoadingState } from "@/components/common/feedback/loading-state";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { ApiClientError } from "@/services/api/api-error";

import {
  OAUTH_INTENT_STORAGE_KEY,
  OAUTH_OTP_SESSION_STORAGE_KEY,
  OAUTH_PROVIDER_STORAGE_KEY,
  OAUTH_SIGNUP_ERROR_STORAGE_KEY,
  type OAuthFlowIntent,
} from "../constants/oauth";
import { authService } from "../services/auth.service";
import { getPostLoginRedirect } from "../utils/redirect";
import { setSessionHintCookie } from "../utils/session-hint";
import { AuthAlert } from "./auth-alert";
import { AuthCard } from "./auth-card";
import { AuthPageShell } from "./auth-page-shell";

function parseProvider(value: string | null): OAuthProviderType | null {
  if (value === OAuthProvider.GOOGLE || value === OAuthProvider.GITHUB) {
    return value;
  }

  return null;
}

function parseIntent(value: string | null): OAuthFlowIntent {
  return value === "signup" ? "signup" : "login";
}

function resolveProvider(searchParams: URLSearchParams): OAuthProviderType | null {
  const fromQuery = parseProvider(searchParams.get("provider"));
  if (fromQuery) {
    return fromQuery;
  }

  if (typeof window === "undefined") {
    return null;
  }

  return parseProvider(sessionStorage.getItem(OAUTH_PROVIDER_STORAGE_KEY));
}

function resolveIntent(): OAuthFlowIntent {
  if (typeof window === "undefined") {
    return "login";
  }

  return parseIntent(sessionStorage.getItem(OAUTH_INTENT_STORAGE_KEY));
}

function clearOAuthFlowStorage(): void {
  sessionStorage.removeItem(OAUTH_PROVIDER_STORAGE_KEY);
  sessionStorage.removeItem(OAUTH_INTENT_STORAGE_KEY);
}

function readOAuthErrorFromUrl(): string | null {
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return (
    query.get("error_description") ||
    query.get("error") ||
    hash.get("error_description") ||
    hash.get("error")
  );
}

function stripOAuthParamsFromUrl(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete("code");
  url.searchParams.delete("state");
  url.hash = "";
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}`);
}

function hasOAuthCallbackParams(): boolean {
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return Boolean(
    query.get("code") ||
      hash.get("access_token") ||
      hash.get("error") ||
      query.get("error"),
  );
}

/**
 * Shared across Strict Mode remounts so the callback completes only once.
 */
let supabaseSessionPromise: Promise<Session> | null = null;

async function waitForSupabaseSession(timeoutMs = 20_000): Promise<Session> {
  if (supabaseSessionPromise) {
    return supabaseSessionPromise;
  }

  supabaseSessionPromise = (async () => {
    const supabase = getSupabaseBrowserClient();
    const oauthError = readOAuthErrorFromUrl();
    if (oauthError) {
      throw new Error(oauthError);
    }

    // detectSessionInUrl runs during client initialize (implicit hash or PKCE code).
    const first = await supabase.auth.getSession();
    if (first.data.session?.access_token) {
      stripOAuthParamsFromUrl();
      return first.data.session;
    }

    if (!hasOAuthCallbackParams()) {
      throw new Error(
        "No OAuth credentials were returned. Confirm Supabase Redirect URLs include your app origin plus /auth/callback (for local development: http://localhost:3000/auth/callback), then try signing in again from this same browser tab.",
      );
    }

    // Manual PKCE exchange only when a code is present and initialize did not
    // already establish a session (e.g. race / older redirect shape).
    const code = new URLSearchParams(window.location.search).get("code");
    if (code) {
      const { data, error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(code);

      if (data.session?.access_token) {
        stripOAuthParamsFromUrl();
        return data.session;
      }

      const afterExchange = await supabase.auth.getSession();
      if (afterExchange.data.session?.access_token) {
        stripOAuthParamsFromUrl();
        return afterExchange.data.session;
      }

      if (exchangeError) {
        throw new Error(exchangeError.message);
      }
    }

    return await new Promise<Session>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        subscription.unsubscribe();
        reject(
          new Error(
            "Unable to retrieve OAuth session from Supabase. Please try signing in again.",
          ),
        );
      }, timeoutMs);

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.access_token) {
          window.clearTimeout(timeout);
          subscription.unsubscribe();
          stripOAuthParamsFromUrl();
          resolve(session);
        }
      });

      void supabase.auth.getSession().then(({ data, error }) => {
        if (error) {
          window.clearTimeout(timeout);
          subscription.unsubscribe();
          reject(error);
          return;
        }

        if (data.session?.access_token) {
          window.clearTimeout(timeout);
          subscription.unsubscribe();
          stripOAuthParamsFromUrl();
          resolve(data.session);
        }
      });
    });
  })().catch((error) => {
    supabaseSessionPromise = null;
    throw error;
  });

  return supabaseSessionPromise;
}

/**
 * Dedupes the full callback completion across React Strict Mode double-mount.
 */
let oauthCompletionPromise: Promise<void> | null = null;

export function OAuthCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const provider = resolveProvider(searchParams);
    const intent = resolveIntent();

    if (!provider) {
      setError("Invalid OAuth provider in callback.");
      return;
    }

    if (!oauthCompletionPromise) {
      oauthCompletionPromise = (async () => {
        const session = await waitForSupabaseSession();

        const accessToken = session.access_token;
        const refreshToken = session.refresh_token ?? undefined;

        const result = await authService.oauthCallback({
          provider,
          intent,
          supabaseAccessToken: accessToken,
          supabaseRefreshToken: refreshToken,
        });

        clearOAuthFlowStorage();

        // Clear the temporary Supabase browser session after we have copied the
        // tokens into our API call. Do this only after the API responds so a
        // Strict Mode remount cannot lose the session mid-flight.
        const supabase = getSupabaseBrowserClient();
        await supabase.auth.signOut({ scope: "local" });

        if (result.requiresOtp && result.otpSessionId) {
          sessionStorage.setItem(
            OAUTH_OTP_SESSION_STORAGE_KEY,
            result.otpSessionId,
          );
          window.location.assign(`${ROUTES.LOGIN}?otpRequired=1`);
          return;
        }

        if (!result.user || !result.tokens) {
          throw new Error("OAuth sign-in failed. Please try again.");
        }

        setSessionHintCookie();
        const redirectTo = getPostLoginRedirect(result.user.role.code);
        window.location.assign(redirectTo);
      })().catch(async (err) => {
        const supabase = getSupabaseBrowserClient();
        await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);

        if (
          err instanceof ApiClientError &&
          err.code === AUTH_ERROR_CODES.EMAIL_ALREADY_EXISTS &&
          intent === "signup"
        ) {
          sessionStorage.setItem(OAUTH_SIGNUP_ERROR_STORAGE_KEY, err.message);
          sessionStorage.setItem(OAUTH_PROVIDER_STORAGE_KEY, provider);
          sessionStorage.removeItem(OAUTH_INTENT_STORAGE_KEY);
          window.location.assign(
            `${ROUTES.LOGIN}?oauthExisting=1&provider=${provider}`,
          );
          return;
        }

        clearOAuthFlowStorage();
        throw err;
      });
    }

    void oauthCompletionPromise.catch((err) => {
      setError(
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message === "signal is aborted without reason"
              ? "Sign-in timed out while contacting the server. Please try again."
              : err.message
            : "OAuth sign-in failed. Please try again.",
      );
    });
  }, [router, searchParams]);

  if (error) {
    return (
      <AuthPageShell>
        <AuthCard title="Sign-in failed" description="We could not complete social login">
          <div className="space-y-4">
            <AuthAlert variant="error" title="OAuth error" description={error} />
            <Button
              className="w-full"
              variant="secondary"
              onClick={() => {
                oauthCompletionPromise = null;
                supabaseSessionPromise = null;
                router.replace(ROUTES.LOGIN);
              }}
            >
              Back to sign in
            </Button>
          </div>
        </AuthCard>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell>
      <AuthCard title="Completing sign-in" description="Verifying your OAuth identity">
        <LoadingState
          label="Signing you in securely"
          className="min-h-[200px] border-0 bg-transparent"
        />
      </AuthCard>
    </AuthPageShell>
  );
}
