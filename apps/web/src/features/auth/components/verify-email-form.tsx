"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { LoadingState } from "@/components/common/feedback/loading-state";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { ApiClientError } from "@/services/api/api-error";

import { useVerifyEmail } from "../hooks/use-verify-email";
import { AuthAlert } from "./auth-alert";

export function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const verifyEmailMutation = useVerifyEmail();
  const attemptedTokenRef = useRef<string | null>(null);

  const [apiError, setApiError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);

  useEffect(() => {
    if (!token || attemptedTokenRef.current === token) {
      return;
    }

    attemptedTokenRef.current = token;
    setApiError(null);

    void verifyEmailMutation
      .mutateAsync({ token })
      .then(() => {
        setIsSuccess(true);
      })
      .catch((error: unknown) => {
        if (error instanceof ApiClientError) {
          setApiError(error.message);
          return;
        }

        setApiError("Unable to verify your email. Please try again.");
      });
  }, [token, verifyEmailMutation]);

  if (!token) {
    return (
      <div className="space-y-4">
        <AuthAlert
          variant="error"
          title="Invalid verification link"
          description="This email verification link is missing a token or has expired."
        />
        <Button asChild className="w-full" variant="secondary">
          <Link href={ROUTES.LOGIN}>Back to sign in</Link>
        </Button>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="space-y-4">
        <AuthAlert
          variant="success"
          title="Email verified"
          description="Your email address has been verified. You can now sign in."
        />
        <Button asChild className="w-full">
          <Link href={ROUTES.LOGIN}>Continue to sign in</Link>
        </Button>
      </div>
    );
  }

  if (apiError) {
    return (
      <div className="space-y-4">
        <AuthAlert variant="error" title="Verification failed" description={apiError} />
        <Button asChild className="w-full" variant="secondary">
          <Link href={ROUTES.LOGIN}>Back to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <LoadingState
      label="Verifying email"
      className="min-h-[120px] border-0 bg-transparent"
    />
  );
}
