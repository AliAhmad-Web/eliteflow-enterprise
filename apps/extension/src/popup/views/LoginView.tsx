import type { SafeUser } from "@enterprise/shared";
import { useEffect, useState, type FormEvent } from "react";

import {
  clearSession,
  hydrateSessionFromStorage,
  refreshAccessToken,
} from "@/shared/api/api-client";
import { authService } from "@/shared/api/auth.service";
import { ApiClientError } from "@/shared/api/api-error";
import { tokenStorage } from "@/shared/auth/storage";
import { MESSAGE_TYPES, sendMessage, type PopupView } from "@/shared/messaging";

import { CrownIcon } from "../components/icons";

type Props = {
  onAuthenticated: (user: SafeUser) => void;
};

export function LoginView({ onAuthenticated }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSessionId, setOtpSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await authService.login(email.trim(), password);
      if (data.requiresOtp && data.otpSessionId) {
        setOtpSessionId(data.otpSessionId);
        return;
      }
      if (data.user) {
        await sendMessage({ type: MESSAGE_TYPES.SESSION_CHANGED });
        onAuthenticated(data.user);
      } else {
        setError("Unexpected login response. Please try again.");
      }
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : "Unable to sign in. Check your credentials.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(event: FormEvent) {
    event.preventDefault();
    if (!otpSessionId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await authService.verifyOtp(otpSessionId, otpCode.trim());
      await sendMessage({ type: MESSAGE_TYPES.SESSION_CHANGED });
      onAuthenticated(data.user);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : "Invalid verification code.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-view">
      <div className="login-hero">
        <div className="brand-mark">
          <CrownIcon />
        </div>
        <h1>EliteFlow</h1>
        <p>Sign in with your EliteFlow account</p>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      {otpSessionId ? (
        <form onSubmit={handleVerifyOtp}>
          <div className="field">
            <label htmlFor="otp">Verification code</label>
            <input
              id="otp"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              placeholder="6-digit code"
              autoComplete="one-time-code"
              required
            />
          </div>
          <button
            className="btn btn-primary btn-block"
            type="submit"
            disabled={loading}
          >
            {loading ? "Verifying…" : "Verify & continue"}
          </button>
          <button
            className="btn btn-ghost btn-block"
            type="button"
            onClick={() => {
              setOtpSessionId(null);
              setOtpCode("");
            }}
          >
            Back to login
          </button>
        </form>
      ) : (
        <form onSubmit={handleLogin}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoComplete="username"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>
          <button
            className="btn btn-primary btn-block"
            type="submit"
            disabled={loading}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      )}

      <p className="footer-note">Same users, roles, and API as Web & Desktop</p>
    </div>
  );
}

export async function bootstrapAuth(): Promise<SafeUser | null> {
  await hydrateSessionFromStorage();
  const refreshToken = await tokenStorage.getRefreshToken();
  const cached = await tokenStorage.getCachedUser();

  if (!refreshToken && !cached) {
    return null;
  }

  try {
    const token = await refreshAccessToken();
    if (!token) {
      await clearSession();
      return null;
    }
    return await authService.getMe();
  } catch {
    await clearSession();
    return null;
  }
}

export function useBootstrapAuth() {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const sessionUser = await bootstrapAuth();
      if (!cancelled) {
        setUser(sessionUser);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { user, setUser, loading };
}

export type { PopupView };
