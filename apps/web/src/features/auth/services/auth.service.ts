import {
  AUTH_API_PREFIX,
  type ForgotPasswordInput,
  type LoginInput,
  type LoginResponse,
  type OAuthCallbackInput,
  type OAuthLinkInput,
  type OAuthUnlinkInput,
  type ResetPasswordInput,
  type SafeUser,
  type Session,
  type SignupInput,
  type VerifyEmailInput,
} from "@enterprise/shared";

import {
  apiRequest,
  refreshAccessToken,
} from "@/services/api/api-client";
import { ApiClientError } from "@/services/api/api-error";

import { useAuthStore } from "../stores/auth.store";
import { resetSessionBootstrap } from "../utils/session-bootstrap-mutex";
import { clearSessionHintCookie } from "../utils/session-hint";

export const authService = {
  async signup(input: SignupInput) {
    return apiRequest<{
      message: string;
      email: string;
      emailSent: boolean;
      emailError?: string;
    }>(`${AUTH_API_PREFIX}/signup`, {
      method: "POST",
      body: input,
      timeoutMs: 60_000,
    });
  },

  async login(input: LoginInput) {
    const data = await apiRequest<{
      user?: SafeUser;
      tokens?: LoginResponse["tokens"];
      requiresOtp?: boolean;
      otpSessionId?: string;
      expiresIn?: number;
    }>(`${AUTH_API_PREFIX}/login`, {
      method: "POST",
      body: input,
      // Remote Postgres often needs >15s for auth + session writes.
      timeoutMs: 60_000,
    });

    if (data.tokens?.accessToken && data.user) {
      useAuthStore.getState().setSession(data.user, data.tokens.accessToken);
    }

    return data;
  },

  async oauthCallback(input: OAuthCallbackInput) {
    const data = await apiRequest<{
      user?: SafeUser;
      tokens?: NonNullable<LoginResponse["tokens"]>;
      requiresOtp?: boolean;
      otpSessionId?: string;
      expiresIn?: number;
    }>(`${AUTH_API_PREFIX}/oauth/callback`, {
      method: "POST",
      body: input,
      // OAuth completion hits remote DB + provider lookups; allow longer than default 15s.
      timeoutMs: 60_000,
    });

    if (data.tokens?.accessToken && data.user) {
      useAuthStore.getState().setSession(data.user, data.tokens.accessToken);
    }

    return data;
  },

  async linkOAuth(input: OAuthLinkInput) {
    return apiRequest<{ message: string; provider: string }>(
      `${AUTH_API_PREFIX}/oauth/link`,
      {
        method: "POST",
        body: input,
        auth: true,
      },
    );
  },

  async unlinkOAuth(input: OAuthUnlinkInput) {
    return apiRequest<{ message: string; provider: string }>(
      `${AUTH_API_PREFIX}/oauth/unlink`,
      {
        method: "POST",
        body: input,
        auth: true,
      },
    );
  },

  async logout() {
    try {
      await apiRequest<{ message: string }>(`${AUTH_API_PREFIX}/logout`, {
        method: "POST",
        auth: true,
        skipRefresh: true,
      });
    } finally {
      useAuthStore.getState().clearSession();
      clearSessionHintCookie();
      resetSessionBootstrap();
    }
  },

  async refresh() {
    // Single in-flight refresh (shared mutex) — prevents Strict Mode / parallel
    // callers from rotating the same cookie twice and killing the session.
    const accessToken = await refreshAccessToken();
    if (!accessToken) {
      throw new ApiClientError(
        "Session expired. Please sign in again.",
        "AUTH_SESSION_EXPIRED",
        401,
      );
    }
    return { accessToken, expiresIn: 900 };
  },

  async getMe() {
    const data = await apiRequest<{ user: SafeUser }>(`${AUTH_API_PREFIX}/me`, {
      auth: true,
      timeoutMs: 60_000,
    });

    const token = useAuthStore.getState().accessToken;
    if (token) {
      useAuthStore.getState().setSession(data.user, token);
    } else {
      useAuthStore.getState().setUser(data.user);
    }

    return data.user;
  },

  async forgotPassword(input: ForgotPasswordInput) {
    return apiRequest<{ message: string }>(
      `${AUTH_API_PREFIX}/forgot-password`,
      {
        method: "POST",
        body: input,
      },
    );
  },

  async resetPassword(input: ResetPasswordInput) {
    return apiRequest<{ message: string }>(
      `${AUTH_API_PREFIX}/reset-password`,
      {
        method: "POST",
        body: input,
      },
    );
  },

  async resendVerification(email: string) {
    return apiRequest<{ message: string }>(
      `${AUTH_API_PREFIX}/resend-verification`,
      {
        method: "POST",
        body: { email },
      },
    );
  },

  async verifyEmail(input: VerifyEmailInput) {
    return apiRequest<{ message: string }>(
      `${AUTH_API_PREFIX}/verify-email`,
      {
        method: "POST",
        body: input,
      },
    );
  },

  async verifyOtp(input: { otpSessionId: string; code: string }) {
    const data = await apiRequest<{
      user: SafeUser;
      tokens: NonNullable<LoginResponse["tokens"]>;
    }>(`${AUTH_API_PREFIX}/verify-otp`, {
      method: "POST",
      body: input,
    });

    useAuthStore.getState().setSession(data.user, data.tokens.accessToken);
    return data;
  },

  async resendOtp(otpSessionId: string) {
    return apiRequest<{ otpSessionId: string; expiresIn: number }>(
      `${AUTH_API_PREFIX}/resend-otp`,
      {
        method: "POST",
        body: { otpSessionId },
      },
    );
  },

  async listSessions() {
    return apiRequest<{ sessions: Session[] }>(`${AUTH_API_PREFIX}/sessions`, {
      auth: true,
    });
  },

  async revokeSession(sessionId: string) {
    return apiRequest<{ message: string }>(
      `${AUTH_API_PREFIX}/sessions/${sessionId}`,
      {
        method: "DELETE",
        auth: true,
      },
    );
  },

  async revokeOtherSessions() {
    return apiRequest<{ message: string; revokedCount: number }>(
      `${AUTH_API_PREFIX}/sessions`,
      {
        method: "DELETE",
        auth: true,
      },
    );
  },

  async renameSession(sessionId: string, deviceName: string) {
    return apiRequest<{ message: string; session: Session }>(
      `${AUTH_API_PREFIX}/sessions/${sessionId}/rename`,
      {
        method: "PATCH",
        body: { deviceName },
        auth: true,
      },
    );
  },
};
