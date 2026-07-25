import type { Metadata } from "next";
import { Suspense } from "react";

import { LoadingState } from "@/components/common/feedback/loading-state";
import { AuthCard } from "@/features/auth/components/auth-card";
import { AuthPageShell } from "@/features/auth/components/auth-page-shell";
import { VerifyEmailForm } from "@/features/auth/components/verify-email-form";

export const metadata: Metadata = {
  title: "Verify email",
};

export default function VerifyEmailPage() {
  return (
    <AuthPageShell>
      <AuthCard
        title="Verify email"
        description="Confirm your email address to activate your account"
      >
        <Suspense
          fallback={
            <LoadingState
              label="Verifying email"
              className="min-h-[160px] border-0 bg-transparent"
            />
          }
        >
          <VerifyEmailForm />
        </Suspense>
      </AuthCard>
    </AuthPageShell>
  );
}
