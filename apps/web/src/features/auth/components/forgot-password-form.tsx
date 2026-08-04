"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@enterprise/shared";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROUTES } from "@/constants/routes";
import { executeRecaptcha } from "@/features/security/lib/recaptcha";
import { ApiClientError, getApiErrorMessage } from "@/services/api/api-error";
import { RECAPTCHA } from "@enterprise/shared";

import { useForgotPassword } from "../hooks/use-forgot-password";
import { AuthAlert } from "./auth-alert";
import { FormFieldError } from "./form-field-error";

export function ForgotPasswordForm() {
  const forgotPasswordMutation = useForgotPassword();
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setApiError(null);
    setIsSuccess(false);

    try {
      const captchaToken = await executeRecaptcha(
        RECAPTCHA.ACTIONS.FORGOT_PASSWORD,
      );
      await forgotPasswordMutation.mutateAsync({ ...values, captchaToken });
      setIsSuccess(true);
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 404) {
        setIsSuccess(true);
        return;
      }

      setApiError(
        getApiErrorMessage(
          error,
          "Unable to process your request. Please try again.",
        ),
      );
    }
  });

  if (isSuccess) {
    return (
      <div className="space-y-4">
        <AuthAlert
          variant="success"
          title="Check your email"
          description="If an account exists for that email address, a password reset link has been sent."
        />
        <Button asChild className="w-full" variant="secondary">
          <Link href={ROUTES.LOGIN}>Back to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {apiError ? (
        <AuthAlert variant="error" title="Request failed" description={apiError} />
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

      <Button
        className="w-full"
        type="submit"
        isLoading={isSubmitting || forgotPasswordMutation.isPending}
      >
        Send reset link
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <Link href={ROUTES.LOGIN} className="text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
