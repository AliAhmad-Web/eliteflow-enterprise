export { AuthAlert } from "./components/auth-alert";
export { ActiveSessionsPanel } from "./components/active-sessions-panel";
export { AuthCard } from "./components/auth-card";
export { AuthGuard } from "./components/auth-guard";
export { AuthGuestGuard } from "./components/auth-guest-guard";
export { AuthPageShell } from "./components/auth-page-shell";
export { AuthProvider } from "./components/auth-provider";
export { RoleHomeRedirect } from "./components/role-home-redirect";
export { ForgotPasswordForm } from "./components/forgot-password-form";
export { FormFieldError } from "./components/form-field-error";
export { LoginForm } from "./components/login-form";
export { OAuthCallbackHandler } from "./components/oauth-callback-handler";
export { PasswordInput } from "./components/password-input";
export { ResetPasswordForm } from "./components/reset-password-form";
export { SessionCard } from "./components/session-card";
export { SignupForm } from "./components/signup-form";
export { SocialLoginButtons } from "./components/social-login-buttons";
export { VerifyEmailForm } from "./components/verify-email-form";

export { useAuth } from "./hooks/use-auth";
export { useCurrentUserQuery } from "./hooks/use-current-user-query";
export { useForgotPassword } from "./hooks/use-forgot-password";
export { useLogin } from "./hooks/use-login";
export { useLogout } from "./hooks/use-logout";
export { useRenameSession } from "./hooks/use-rename-session";
export { useResendVerification } from "./hooks/use-resend-verification";
export { useResetPassword } from "./hooks/use-reset-password";
export { useRevokeOtherSessions } from "./hooks/use-revoke-other-sessions";
export { useRevokeSession } from "./hooks/use-revoke-session";
export { useSessions } from "./hooks/use-sessions";
export { useSignup } from "./hooks/use-signup";
export { useVerifyEmail } from "./hooks/use-verify-email";
export { useResendOtp, useVerifyOtp } from "./hooks/use-verify-otp";

export { authService } from "./services/auth.service";
export { useAuthStore } from "./stores/auth.store";

export type {
  AuthStore,
  AuthStoreActions,
  AuthStoreState,
  LoginServiceInput,
} from "./types/auth.types";
export { AUTH_QUERY_KEYS } from "./types/auth.types";

export { getPostLoginRedirect } from "./utils/redirect";
export {
  clearSessionHintCookie,
  getSessionHintCookieName,
  setSessionHintCookie,
} from "./utils/session-hint";
