"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  loginSchema,
  RECAPTCHA,
  type LoginInput,
  type UserRole,
} from "@enterprise/shared";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROUTES } from "@/constants/routes";
import { executeRecaptcha } from "@/features/security/lib/recaptcha";
import { ApiClientError } from "@/services/api/api-error";

import { useLogin } from "../hooks/use-login";
import { useResendVerification } from "../hooks/use-resend-verification";
import { useResendOtp, useVerifyOtp } from "../hooks/use-verify-otp";
import { getRememberedEmail, setRememberedEmail } from "../utils/remember-me";
import { getPostLoginRedirect } from "../utils/redirect";
import { setSessionHintCookie } from "../utils/session-hint";
import { AuthAlert } from "./auth-alert";
import { FormFieldError } from "./form-field-error";
import { PasswordInput } from "./password-input";
import { SocialLoginButtons } from "./social-login-buttons";
import {
  OAUTH_OTP_SESSION_STORAGE_KEY,
  OAUTH_PROVIDER_STORAGE_KEY,
  OAUTH_SIGNUP_ERROR_STORAGE_KEY,
} from "../constants/oauth";

const SIGNUP_SUCCESS_DESCRIPTION =
  "Account created successfully. A verification email has been sent to your email address. Please verify your email before signing in. If you don't receive the email within a few minutes, check your Spam folder or click Resend verification email.";

const OAUTH_SIGNUP_EXISTS_FALLBACK =
  "An account with this email already exists. Please sign in instead.";

export function LoginForm() {
  const searchParams = useSearchParams();
  const loginMutation = useLogin();
  const verifyOtpMutation = useVerifyOtp();
  const resendOtpMutation = useResendOtp();
  const resendVerificationMutation = useResendVerification();

  const [apiError, setApiError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [rememberMe, setRememberMe] = useState(Boolean(getRememberedEmail()));
  const [otpSessionId, setOtpSessionId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpInfo, setOtpInfo] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  const [oauthExistingError, setOauthExistingError] = useState<string | null>(
    null,
  );

  const registered = searchParams.get("registered") === "1";
  const emailSentFailed = searchParams.get("emailSent") === "0";
  const registeredEmail = searchParams.get("email") ?? "";
  const oauthExisting = searchParams.get("oauthExisting") === "1";
  const oauthProvider = searchParams.get("provider");
  const otpRequired = searchParams.get("otpRequired") === "1";
  const [signupEmailError, setSignupEmailError] = useState<string | null>(null);

  useEffect(() => {
    if (!registered || !emailSentFailed) {
      return;
    }
    setSignupEmailError(sessionStorage.getItem("signupEmailError"));
  }, [registered, emailSentFailed]);

  useEffect(() => {
    if (!otpRequired) {
      return;
    }

    const pendingOtpSessionId = sessionStorage.getItem(
      OAUTH_OTP_SESSION_STORAGE_KEY,
    );
    if (!pendingOtpSessionId) {
      return;
    }

    sessionStorage.removeItem(OAUTH_OTP_SESSION_STORAGE_KEY);
    setOtpSessionId(pendingOtpSessionId);
    setOtpCode("");
    setOtpInfo("Enter the verification code sent to your email.");
  }, [otpRequired]);

  useEffect(() => {
    if (!oauthExisting) {
      return;
    }

    const stored =
      sessionStorage.getItem(OAUTH_SIGNUP_ERROR_STORAGE_KEY) ??
      OAUTH_SIGNUP_EXISTS_FALLBACK;
    setOauthExistingError(stored);
    sessionStorage.removeItem(OAUTH_SIGNUP_ERROR_STORAGE_KEY);

    if (
      oauthProvider === "GOOGLE" ||
      oauthProvider === "GITHUB"
    ) {
      sessionStorage.setItem(OAUTH_PROVIDER_STORAGE_KEY, oauthProvider);
    }
  }, [oauthExisting, oauthProvider]);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: registeredEmail || getRememberedEmail(),
      password: "",
    },
  });

  const handleResendVerification = async () => {
    const email = (getValues("email") || registeredEmail).trim();
    if (!email) {
      setResendError("Enter your email address to resend the verification link.");
      return;
    }

    setResendError(null);
    setResendMessage(null);

    try {
      const result = await resendVerificationMutation.mutateAsync(email);
      setResendMessage(result.message);
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("signupEmailError");
      }
    } catch (error) {
      if (error instanceof ApiClientError) {
        setResendError(error.message);
        return;
      }
      setResendError("Unable to resend verification email. Please try again.");
    }
  };

  const completeLogin = (roleCode: UserRole) => {
    const redirectTo = getPostLoginRedirect(
      roleCode,
      searchParams.get("redirect"),
    );
    // Hard navigation avoids Next.js soft-nav "Rendering..." hangs after auth.
    window.location.assign(redirectTo);
  };

  const onSubmit = handleSubmit(async (values) => {
    setIsSigningIn(true);
    setApiError(null);
    setOtpInfo(null);

    try {
      const captchaToken = await executeRecaptcha(RECAPTCHA.ACTIONS.LOGIN);
      const result = await loginMutation.mutateAsync({
        email: values.email,
        password: values.password,
        captchaToken,
      });

      setRememberedEmail(rememberMe ? values.email : null);

      if (result.requiresOtp && result.otpSessionId) {
        setOtpSessionId(result.otpSessionId);
        setOtpCode("");
        setOtpInfo("Enter the verification code sent to your email.");
        return;
      }

      if (!result.user || !result.tokens) {
        setApiError("Unable to sign in. Please try again.");
        return;
      }

      setSessionHintCookie();
      completeLogin(result.user.role.code);
    } catch (error) {
      if (error instanceof ApiClientError) {
        setApiError(error.message);
        return;
      }

      setApiError(
        error instanceof Error
          ? error.message
          : "Unable to sign in. Please try again.",
      );
    } finally {
      setIsSigningIn(false);
    }
  });

  const onVerifyOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!otpSessionId) {
      return;
    }

    setApiError(null);
    setOtpInfo(null);

    try {
      const result = await verifyOtpMutation.mutateAsync({
        otpSessionId,
        code: otpCode.trim(),
      });

      completeLogin(result.user.role.code);
    } catch (error) {
      if (error instanceof ApiClientError) {
        setApiError(error.message);
        return;
      }

      setApiError("Unable to verify code. Please try again.");
    }
  };

  const onResendOtp = async () => {
    if (!otpSessionId) {
      return;
    }

    setApiError(null);

    try {
      const result = await resendOtpMutation.mutateAsync(otpSessionId);
      setOtpSessionId(result.otpSessionId);
      setOtpInfo("A new verification code has been sent.");
    } catch (error) {
      if (error instanceof ApiClientError) {
        setApiError(error.message);
        return;
      }

      setApiError("Unable to resend code. Please try again.");
    }
  };

  if (otpSessionId) {
    return (
      <form onSubmit={onVerifyOtp} className="space-y-4" noValidate>
        {otpInfo ? (
          <AuthAlert variant="success" title="Verification required" description={otpInfo} />
        ) : null}

        {apiError ? (
          <AuthAlert variant="error" title="Verification failed" description={apiError} />
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="otp-code" required>
            Verification code
          </Label>
          <Input
            id="otp-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="6-digit code"
            maxLength={6}
            value={otpCode}
            onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            aria-invalid={otpCode.length > 0 && otpCode.length !== 6}
          />
          <p className="text-xs text-muted-foreground">
            Signed in as {getValues("email")}
          </p>
        </div>

        <Button
          className="w-full"
          type="submit"
          isLoading={verifyOtpMutation.isPending}
          disabled={otpCode.length !== 6}
        >
          Verify and continue
        </Button>

        <Button
          className="w-full"
          type="button"
          variant="ghost"
          onClick={() => void onResendOtp()}
          isLoading={resendOtpMutation.isPending}
        >
          Resend code
        </Button>

        <button
          type="button"
          className="w-full text-center text-sm text-primary hover:underline"
          onClick={() => {
            setOtpSessionId(null);
            setOtpCode("");
            setApiError(null);
            setOtpInfo(null);
          }}
        >
          Back to sign in
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {oauthExistingError ? (
        <AuthAlert
          variant="error"
          title="Account already exists"
          description={oauthExistingError}
        />
      ) : null}

      {registered ? (
        <div className="space-y-3">
          {emailSentFailed ? (
            <AuthAlert
              variant="error"
              title="Account created — verification email not sent"
              description={
                signupEmailError ??
                "Your account was created, but we could not send the verification email. Please click Resend verification email below."
              }
            />
          ) : (
            <AuthAlert
              variant="success"
              title="Account created — verify your email"
              description={SIGNUP_SUCCESS_DESCRIPTION}
            />
          )}

          {resendMessage ? (
            <AuthAlert
              variant="success"
              title="Verification email"
              description={resendMessage}
            />
          ) : null}

          {resendError ? (
            <AuthAlert
              variant="error"
              title="Could not resend email"
              description={resendError}
            />
          ) : null}

          <Button
            type="button"
            variant="secondary"
            className="w-full"
            isLoading={resendVerificationMutation.isPending}
            onClick={() => {
              void handleResendVerification();
            }}
          >
            Resend verification email
          </Button>
        </div>
      ) : null}

      {apiError ? (
        <AuthAlert variant="error" title="Sign in failed" description={apiError} />
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="email" required>
          Email
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="you@company.com"
          autoComplete="email"
          error={Boolean(errors.email)}
          {...register("email")}
        />
        <FormFieldError message={errors.email?.message} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" required>
            Password
          </Label>
          <Link
            href={ROUTES.FORGOT_PASSWORD}
            className="text-sm text-primary hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <PasswordInput
          id="password"
          placeholder="••••••••"
          error={Boolean(errors.password)}
          {...register("password")}
        />
        <FormFieldError message={errors.password?.message} />
      </div>

      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border border-input accent-primary"
          checked={rememberMe}
          onChange={(event) => setRememberMe(event.target.checked)}
          aria-describedby="remember-me-hint"
        />
        <span>Remember me</span>
      </label>
      <p id="remember-me-hint" className="sr-only">
        Saves your email on this device for faster sign-in next time.
      </p>

      <Button
        className="w-full"
        type="submit"
        isLoading={isSigningIn || isSubmitting || loginMutation.isPending}
      >
        Sign in
      </Button>

      <SocialLoginButtons mode="login" />

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href={ROUTES.SIGNUP} className="text-primary hover:underline">
          Create account
        </Link>
      </p>

      <p className="text-center text-[11px] leading-relaxed text-muted-foreground/80">
        This site is protected by reCAPTCHA and the Google{" "}
        <a
          href="https://policies.google.com/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-foreground"
        >
          Privacy Policy
        </a>{" "}
        and{" "}
        <a
          href="https://policies.google.com/terms"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-foreground"
        >
          Terms of Service
        </a>{" "}
        apply.
      </p>
    </form>
  );
}
