import {
  AUTH_API_PREFIX,
  RECAPTCHA,
  type LoginResponse,
  type SafeUser,
} from "@enterprise/shared";

import {
  apiRequest,
  clearSession,
  getMemoryAccessToken,
  refreshAccessToken,
  setSession,
} from "../api/api-client";
import { ApiClientError } from "../api/api-error";
import { getCaptchaToken } from "../auth/recaptcha";

export const authService = {
  async login(email: string, password: string) {
    const captchaToken = await getCaptchaToken(RECAPTCHA.ACTIONS.LOGIN);
    const data = await apiRequest<{
      user?: SafeUser;
      tokens?: LoginResponse["tokens"];
      requiresOtp?: boolean;
      otpSessionId?: string;
      expiresIn?: number;
    }>(`${AUTH_API_PREFIX}/login`, {
      method: "POST",
      body: { email, password, captchaToken },
      timeoutMs: 60_000,
      captureRefreshCookie: true,
    });

    if (data.tokens?.accessToken && data.user) {
      await setSession(data.user, data.tokens.accessToken);
    }

    return data;
  },

  async verifyOtp(otpSessionId: string, code: string) {
    const data = await apiRequest<{
      user: SafeUser;
      tokens: NonNullable<LoginResponse["tokens"]>;
    }>(`${AUTH_API_PREFIX}/verify-otp`, {
      method: "POST",
      body: { otpSessionId, code },
      captureRefreshCookie: true,
    });

    await setSession(data.user, data.tokens.accessToken);
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
      await clearSession();
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

    const token = getMemoryAccessToken();
    if (token) {
      await setSession(data.user, token);
    }
    return data.user;
  },
};
