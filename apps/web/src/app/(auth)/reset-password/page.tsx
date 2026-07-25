import type { Metadata } from "next";
import { Suspense } from "react";

import { LoadingState } from "@/components/common/feedback/loading-state";
import { AuthCard } from "@/features/auth/components/auth-card";
import { AuthPageShell } from "@/features/auth/components/auth-page-shell";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export const metadata: Metadata = {
  title: "Reset password",
};

export default function ResetPasswordPage() {
  return (
    <AuthPageShell>
      <AuthCard title="Reset password" description="Choose a new password for your account">
        <Suspense
          fallback={
            <LoadingState
              label="Loading reset form"
              className="min-h-[280px] border-0 bg-transparent"
            />
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </AuthCard>
    </AuthPageShell>
  );
}
