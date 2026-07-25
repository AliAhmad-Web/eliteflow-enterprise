import type { LoginInput, SafeUser } from "@enterprise/shared";

export type LoginServiceInput = LoginInput;

export interface AuthStoreState {
  user: SafeUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
}

export interface AuthStoreActions {
  setSession: (user: SafeUser, accessToken: string) => void;
  setAccessToken: (accessToken: string) => void;
  setUser: (user: SafeUser) => void;
  clearSession: () => void;
  setInitialized: (value: boolean) => void;
}

export type AuthStore = AuthStoreState & AuthStoreActions;

export const AUTH_QUERY_KEYS = {
  me: ["auth", "me"] as const,
  sessions: ["auth", "sessions"] as const,
};
