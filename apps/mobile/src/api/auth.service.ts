import {
  AUTH_API_PREFIX,
  type ForgotPasswordInput,
  type LoginInput,
  type LoginResponse,
  type SafeUser,
} from "@enterprise/shared";

import { useAuthStore } from "@/auth/auth.store";

import { apiRequest, refreshAccessToken } from "./api-client";
import { ApiClientError } from "./api-error";

export type MfaStatus = {
  enabled: boolean;
  enrollmentRequired: boolean;
  hasRecoveryCodes: boolean;
};

export const authService = {
  async login(input: LoginInput) {
    const data = await apiRequest<{
      user?: SafeUser;
      tokens?: LoginResponse["tokens"];
      requiresOtp?: boolean;
      otpSessionId?: string;
      expiresIn?: number;
      mfaMethod?: "totp" | "email";
    }>(`${AUTH_API_PREFIX}/login`, {
      method: "POST",
      body: input,
      timeoutMs: 60_000,
      captureRefreshCookie: true,
    });

    if (data.tokens?.accessToken && data.user) {
      await useAuthStore
        .getState()
        .setSession(data.user, data.tokens.accessToken);
    }

    return data;
  },

  async logout() {
    try {
      await apiRequest<{ message: string }>(`${AUTH_API_PREFIX}/logout`, {
        method: "POST",
        auth: true,
        skipRefresh: true,
      });
    } finally {
      await useAuthStore.getState().clearSession();
    }
  },

  async refresh() {
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
      await useAuthStore.getState().setSession(data.user, token);
    } else {
      await useAuthStore.getState().setUser(data.user);
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

  async verifyOtp(input: { otpSessionId: string; code: string }) {
    const data = await apiRequest<{
      user: SafeUser;
      tokens: NonNullable<LoginResponse["tokens"]>;
    }>(`${AUTH_API_PREFIX}/verify-otp`, {
      method: "POST",
      body: input,
      captureRefreshCookie: true,
    });

    await useAuthStore
      .getState()
      .setSession(data.user, data.tokens.accessToken);
    return data;
  },

  async getMfaStatus() {
    return apiRequest<MfaStatus>(`${AUTH_API_PREFIX}/mfa/status`, {
      auth: true,
    });
  },

  async setupMfa() {
    return apiRequest<{
      secret: string;
      otpauthUrl: string;
      qrCodeDataUrl?: string;
    }>(`${AUTH_API_PREFIX}/mfa/setup`, {
      method: "POST",
      auth: true,
      body: {},
    });
  },

  async enableMfa(input: { code: string }) {
    return apiRequest<{ message: string }>(`${AUTH_API_PREFIX}/mfa/enable`, {
      method: "POST",
      auth: true,
      body: input,
    });
  },

  async disableMfa(input: { code: string }) {
    return apiRequest<{ message: string }>(`${AUTH_API_PREFIX}/mfa/disable`, {
      method: "POST",
      auth: true,
      body: input,
    });
  },
};
