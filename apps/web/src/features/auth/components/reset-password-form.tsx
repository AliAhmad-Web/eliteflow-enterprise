"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@enterprise/shared";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ROUTES } from "@/constants/routes";
import { executeRecaptcha } from "@/features/security/lib/recaptcha";
import { ApiClientError } from "@/services/api/api-error";
import { RECAPTCHA } from "@enterprise/shared";

import { useResetPassword } from "../hooks/use-reset-password";
import { getFieldErrorMessage } from "../utils/form-errors";
import { AuthAlert } from "./auth-alert";
import { FormFieldError } from "./form-field-error";
import { PasswordInput } from "./password-input";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const resetPasswordMutation = useResetPassword();
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token,
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setApiError(null);

    if (!token) {
      setApiError("Reset token is missing or invalid.");
      return;
    }

    try {
      const captchaToken = await executeRecaptcha(
        RECAPTCHA.ACTIONS.RESET_PASSWORD,
      );
      await resetPasswordMutation.mutateAsync({
        token,
        password: values.password,
        captchaToken,
      });
      setIsSuccess(true);
    } catch (error) {
      if (error instanceof ApiClientError) {
        setApiError(error.message);
        return;
      }

      setApiError("Unable to reset password. Please try again.");
    }
  });

  if (!token) {
    return (
      <div className="space-y-4">
        <AuthAlert
          variant="error"
          title="Invalid reset link"
          description="This password reset link is missing a token or has expired."
        />
        <Button asChild className="w-full" variant="secondary">
          <Link href={ROUTES.FORGOT_PASSWORD}>Request a new link</Link>
        </Button>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="space-y-4">
        <AuthAlert
          variant="success"
          title="Password updated"
          description="Your password has been reset. You can now sign in with your new password."
        />
        <Button asChild className="w-full">
          <Link href={ROUTES.LOGIN}>Continue to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <input type="hidden" {...register("token")} />

      {apiError ? (
        <AuthAlert variant="error" title="Reset failed" description={apiError} />
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="password" required>
          New password
        </Label>
        <PasswordInput
          id="password"
          autoComplete="new-password"
          placeholder="Enter a new password"
          error={Boolean(errors.password)}
          {...register("password")}
        />
        <FormFieldError message={getFieldErrorMessage(errors.password)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword" required>
          Confirm new password
        </Label>
        <PasswordInput
          id="confirmPassword"
          autoComplete="new-password"
          placeholder="Repeat your new password"
          error={Boolean(errors.confirmPassword)}
          {...register("confirmPassword")}
        />
        <FormFieldError message={getFieldErrorMessage(errors.confirmPassword)} />
      </div>

      <Button
        className="w-full"
        type="submit"
        isLoading={isSubmitting || resetPasswordMutation.isPending}
      >
        Reset password
      </Button>
    </form>
  );
}
