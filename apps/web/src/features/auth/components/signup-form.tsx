"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema, type SignupInput } from "@enterprise/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROUTES } from "@/constants/routes";
import { executeRecaptcha } from "@/features/security/lib/recaptcha";
import { getApiErrorMessage } from "@/services/api/api-error";
import { RECAPTCHA } from "@enterprise/shared";

import { useSignup } from "../hooks/use-signup";
import { getFieldErrorMessage } from "../utils/form-errors";
import { AuthAlert } from "./auth-alert";
import { FormFieldError } from "./form-field-error";
import { PasswordInput } from "./password-input";
import { SocialLoginButtons } from "./social-login-buttons";

export function SignupForm() {
  const router = useRouter();
  const signupMutation = useSignup();
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      acceptTerms: undefined,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setApiError(null);

    try {
      const captchaToken = await executeRecaptcha(RECAPTCHA.ACTIONS.SIGNUP);
      const result = await signupMutation.mutateAsync({
        ...values,
        captchaToken,
      });
      const params = new URLSearchParams({
        registered: "1",
        email: result.email,
      });

      if (!result.emailSent) {
        params.set("emailSent", "0");
        if (typeof window !== "undefined") {
          sessionStorage.setItem(
            "signupEmailError",
            result.emailError ??
              "Verification email could not be sent. Please try resending it.",
          );
        }
      } else if (typeof window !== "undefined") {
        sessionStorage.removeItem("signupEmailError");
      }

      router.push(`${ROUTES.LOGIN}?${params.toString()}`);
    } catch (error) {
      setApiError(
        getApiErrorMessage(error, "Unable to create account. Please try again."),
      );
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {apiError ? (
        <AuthAlert variant="error" title="Sign up failed" description={apiError} />
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="firstName" required>
            First name
          </Label>
          <Input
            id="firstName"
            placeholder="Alex"
            autoComplete="given-name"
            error={Boolean(errors.firstName)}
            {...register("firstName")}
          />
          <FormFieldError message={getFieldErrorMessage(errors.firstName)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName" required>
            Last name
          </Label>
          <Input
            id="lastName"
            placeholder="Morgan"
            autoComplete="family-name"
            error={Boolean(errors.lastName)}
            {...register("lastName")}
          />
          <FormFieldError message={getFieldErrorMessage(errors.lastName)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-email" required>
          Email
        </Label>
        <Input
          id="signup-email"
          type="email"
          placeholder="you@company.com"
          autoComplete="email"
          error={Boolean(errors.email)}
          {...register("email")}
        />
        <FormFieldError message={getFieldErrorMessage(errors.email)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-password" required>
          Password
        </Label>
        <PasswordInput
          id="signup-password"
          autoComplete="new-password"
          placeholder="Create a strong password"
          error={Boolean(errors.password)}
          {...register("password")}
        />
        <FormFieldError message={getFieldErrorMessage(errors.password)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword" required>
          Confirm password
        </Label>
        <PasswordInput
          id="confirmPassword"
          autoComplete="new-password"
          placeholder="Repeat your password"
          error={Boolean(errors.confirmPassword)}
          {...register("confirmPassword")}
        />
        <FormFieldError message={getFieldErrorMessage(errors.confirmPassword)} />
      </div>

      <div className="space-y-2">
        <label className="flex items-start gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border border-input accent-primary"
            {...register("acceptTerms")}
          />
          <span>I agree to the terms and conditions</span>
        </label>
        <FormFieldError message={getFieldErrorMessage(errors.acceptTerms)} />
      </div>

      <Button
        className="w-full"
        type="submit"
        isLoading={isSubmitting || signupMutation.isPending}
      >
        Create account
      </Button>

      <SocialLoginButtons mode="signup" />

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href={ROUTES.LOGIN} className="text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
