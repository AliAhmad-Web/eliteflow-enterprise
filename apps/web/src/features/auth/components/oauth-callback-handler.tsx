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
  OAUTH_MFA_METHOD_STORAGE_KEY,
  OAUTH_OTP_SESSION_STORAGE_KEY,
  OAUTH_PROVIDER_STORAGE_KEY,
  OAUTH_SIGNUP_ERROR_STORAGE_KEY,
  type OAuthFlowIntent,
} from "../constants/oauth";
import { authService } from "../services/auth.service";
import {
  captureOAuthRedirectParams,
  clearCapturedOAuthRedirect,
  getOAuthParamsFromCapture,
  readCapturedOAuthRedirect,
} from "../utils/oauth-redirect-capture";
import { getPostLoginRedirect } from "../utils/redirect";
import { setSessionHintCookie } from "../utils/session-hint";
import { AuthAlert } from "./auth-alert";
import { AuthCard } from "./auth-card";
import { AuthPageShell } from "./auth-page-shell";

// Capture redirect params as soon as this module evaluates in the browser —
// before Supabase detectSessionInUrl clears the hash/query.
if (typeof window !== "undefined") {
  captureOAuthRedirectParams();
}

function parseProvider(value: string | null | undefined): OAuthProviderType | null {
  if (!value) return null;
  const normalized = value.trim().toUpperCase();
  if (normalized === OAuthProvider.GOOGLE || normalized === "GOOGLE") {
    return OAuthProvider.GOOGLE;
  }
  if (normalized === OAuthProvider.GITHUB || normalized === "GITHUB") {
    return OAuthProvider.GITHUB;
  }
  return null;
}

function mapSupabaseProvider(
  value: string | null | undefined,
): OAuthProviderType | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "google") return OAuthProvider.GOOGLE;
  if (normalized === "github") return OAuthProvider.GITHUB;
  return parseProvider(value);
}

function parseIntent(value: string | null): OAuthFlowIntent {
  return value === "signup" ? "signup" : "login";
}

function readStoredProvider(): OAuthProviderType | null {
  if (typeof window === "undefined") return null;
  return (
    parseProvider(sessionStorage.getItem(OAUTH_PROVIDER_STORAGE_KEY)) ??
    parseProvider(localStorage.getItem(OAUTH_PROVIDER_STORAGE_KEY))
  );
}

function readStoredIntent(): OAuthFlowIntent {
  if (typeof window === "undefined") return "login";
  return parseIntent(
    sessionStorage.getItem(OAUTH_INTENT_STORAGE_KEY) ??
      localStorage.getItem(OAUTH_INTENT_STORAGE_KEY),
  );
}

function inferProviderFromSession(session: Session): OAuthProviderType | null {
  const appMeta = (session.user?.app_metadata ?? {}) as Record<string, unknown>;
  const fromApp = mapSupabaseProvider(
    typeof appMeta.provider === "string" ? appMeta.provider : null,
  );
  if (fromApp) return fromApp;

  const providers = Array.isArray(appMeta.providers)
    ? appMeta.providers.filter((v): v is string => typeof v === "string")
    : [];
  for (const entry of providers) {
    const mapped = mapSupabaseProvider(entry);
    if (mapped) return mapped;
  }

  const identities = session.user?.identities ?? [];
  for (const identity of identities) {
    const mapped = mapSupabaseProvider(identity.provider);
    if (mapped) return mapped;
  }

  return null;
}

function resolveProvider(
  searchParams: URLSearchParams,
  session?: Session | null,
): OAuthProviderType | null {
  const fromQuery =
    parseProvider(searchParams.get("provider")) ??
    mapSupabaseProvider(searchParams.get("provider"));
  if (fromQuery) return fromQuery;

  const fromStorage = readStoredProvider();
  if (fromStorage) return fromStorage;

  if (session) {
    return inferProviderFromSession(session);
  }

  return null;
}

function resolveIntent(): OAuthFlowIntent {
  return readStoredIntent();
}

function clearOAuthFlowStorage(): void {
  sessionStorage.removeItem(OAUTH_PROVIDER_STORAGE_KEY);
  sessionStorage.removeItem(OAUTH_INTENT_STORAGE_KEY);
  localStorage.removeItem(OAUTH_PROVIDER_STORAGE_KEY);
  localStorage.removeItem(OAUTH_INTENT_STORAGE_KEY);
}

function readOAuthErrorFromParams(params: URLSearchParams): string | null {
  return params.get("error_description") || params.get("error");
}

function stripOAuthParamsFromUrl(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete("code");
  url.searchParams.delete("state");
  url.hash = "";
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}`);
  clearCapturedOAuthRedirect();
}

function hasOAuthCallbackParams(params: URLSearchParams): boolean {
  return Boolean(
    params.get("code") ||
      params.get("access_token") ||
      params.get("error") ||
      params.get("error_description"),
  );
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => window.setTimeout(resolve, ms));
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
    // Re-capture in case module evaluated before the redirect URL was ready.
    captureOAuthRedirectParams();
    const captured = readCapturedOAuthRedirect();
    const params = getOAuthParamsFromCapture(captured);

    const oauthError = readOAuthErrorFromParams(params);
    if (oauthError) {
      throw new Error(oauthError);
    }

    const supabase = getSupabaseBrowserClient();

    // detectSessionInUrl may still be processing — poll briefly before failing.
    const deadline = Date.now() + Math.min(timeoutMs, 8_000);
    while (Date.now() < deadline) {
      const current = await supabase.auth.getSession();
      if (current.data.session?.access_token) {
        stripOAuthParamsFromUrl();
        return current.data.session;
      }
      if (!hasOAuthCallbackParams(params) && !hasOAuthCallbackParams(getOAuthParamsFromCapture())) {
        // No credentials anywhere yet — keep waiting a bit for late capture.
        await sleep(150);
        captureOAuthRedirectParams();
        continue;
      }
      break;
    }

    const latestParams = getOAuthParamsFromCapture();
    const code = latestParams.get("code");
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

    const accessToken = latestParams.get("access_token");
    const refreshToken = latestParams.get("refresh_token");
    if (accessToken) {
      const { data, error: setError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken ?? "",
      });
      if (data.session?.access_token) {
        stripOAuthParamsFromUrl();
        return data.session;
      }
      if (setError) {
        throw new Error(setError.message);
      }
    }

    if (!hasOAuthCallbackParams(latestParams)) {
      throw new Error(
        "No OAuth credentials were returned. In Supabase → Authentication → URL Configuration, add Redirect URL http://localhost:3000/auth/callback (and set Site URL to http://localhost:3000). Then start Google sign-in again from this same browser tab.",
      );
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
    const intent = resolveIntent();

    if (!oauthCompletionPromise) {
      oauthCompletionPromise = (async () => {
        const session = await waitForSupabaseSession();

        const provider = resolveProvider(searchParams, session);
        if (!provider) {
          throw new Error(
            "Could not determine OAuth provider. Please start Google or GitHub sign-in again from this browser.",
          );
        }

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
          if (result.mfaMethod) {
            sessionStorage.setItem(
              OAUTH_MFA_METHOD_STORAGE_KEY,
              result.mfaMethod,
            );
          }
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

        const providerHint =
          resolveProvider(searchParams) ?? readStoredProvider();

        if (
          err instanceof ApiClientError &&
          err.code === AUTH_ERROR_CODES.EMAIL_ALREADY_EXISTS &&
          intent === "signup" &&
          providerHint
        ) {
          sessionStorage.setItem(OAUTH_SIGNUP_ERROR_STORAGE_KEY, err.message);
          sessionStorage.setItem(OAUTH_PROVIDER_STORAGE_KEY, providerHint);
          localStorage.setItem(OAUTH_PROVIDER_STORAGE_KEY, providerHint);
          sessionStorage.removeItem(OAUTH_INTENT_STORAGE_KEY);
          localStorage.removeItem(OAUTH_INTENT_STORAGE_KEY);
          window.location.assign(
            `${ROUTES.LOGIN}?oauthExisting=1&provider=${providerHint}`,
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
          className="min-h-50 border-0 bg-transparent"
        />
      </AuthCard>
    </AuthPageShell>
  );
}
